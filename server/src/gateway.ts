/**
 * HTTP gateway for `/api/chat` (DESIGN §3 D1, §4). A router mounted by
 * `index.ts`, preserving the frontend SSE contract verbatim. It owns auth and
 * quota, then drives the protocol-agnostic `captainAdelFlow` and translates its
 * stream/result into either the legacy SSE frames or a buffered `ChatResponse`.
 *
 * Ported off Cloud Functions: the Firebase session-cookie/App Check checks became
 * this service's own session verification, and every Firestore transaction became
 * an atomic Postgres statement in `store.ts`.
 */
import { createHash } from "node:crypto";
import express from "express";
import rateLimit from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import { captainAdelFlow } from "./captain-adel.js";
import { createRateLimiter } from "./rate-limit-core.js";
import { isPaidActive, type Entitlement } from "./billing-core.js";
import { dayKey, secondsUntilUtcReset, ANON_DAILY_LIMIT } from "./chat-quota-core.js";
import { extractApiKey, hashApiKey } from "./api-key-core.js";
import { apiTier, isOverMonthlyQuota, monthKey, remainingThisMonth, API_TIERS } from "./api-tier-core.js";
import { anonymousAuthContext, extractBearerToken, type AuthContext } from "./auth-core.js";
import { parseFeedback } from "./feedback-core.js";
import { isUnconfigured } from "./model.js";
import { MODEL_UNCONFIGURED, QUOTA_EXCEEDED, RATE_LIMITED, STREAM_FAILED } from "./contract.js";
import { frame, doneFrame, pingFrame, SSE_HEADERS } from "./sse.js";
import { parseCookies, parseRequest, MESSAGE_MAX_CHARS } from "./gateway-core.js";
import { config } from "./config.js";
import { verifySession } from "./session.js";
import {
  findUserById,
  getEntitlement,
  consumeDailyQuota as consumeDailyQuotaRow,
  spendOneChatCredit,
  recordAnswerFeedback,
} from "./store.js";
import { query, queryOne } from "./db.js";

// The enforced free-tier limits. Defaults live in chat-quota-core (mirrored by the
// client); CHAT_FREE_DAILY_LIMIT / ANON_DAILY_LIMIT tune them per revision without
// a code change, exactly as the Firebase params did.
const FREE_DAILY_LIMIT_ENFORCED = config.chat.freeDailyLimit;
const ANON_DAILY_LIMIT_ENFORCED = Number(process.env.ANON_DAILY_LIMIT ?? ANON_DAILY_LIMIT);

/** Thrown by `authenticate` when an enforced check fails → mapped to 403. */
export class AuthError extends Error {}

/**
 * Resolve the caller's session (optional → anonymous). A valid session cookie is
 * preferred; the native shell presents the same token as a bearer header. An
 * invalid credential yields an anonymous context, never a 401 — Captain Adel is
 * usable without an account, metered by hashed IP.
 *
 * Exported for unit testing; the route handlers below are the only callers.
 */
export async function authenticate(req: Request): Promise<AuthContext> {
  const cookies = parseCookies(req.headers?.cookie);
  const token =
    cookies[config.session.cookieName] ?? extractBearerToken(req.header("Authorization"));

  const uid = await verifySession(token);
  if (!uid) return anonymousAuthContext();

  const row = await findUserById(uid);
  if (!row) return anonymousAuthContext();
  return { uid: row.id, email: row.email, emailVerified: row.email_verified };
}

const app = express.Router();
// Rate limiting: 30 requests per minute per IP — a best-effort backstop in front of
// the chat surface. `trust proxy` is set on the parent app (see index.ts).
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
    // CORS preflights don't burn budget; licensed API traffic (/v1) is governed by
    // the per-key limiter below, not this per-IP backstop (a partner's calls
    // share one IP).
    skip: (req) =>
      req.method === "OPTIONS" || req.path.startsWith("/v1") || req.path.startsWith("/api/v1"),
    validate: { trustProxy: false }, // the parent app's hop count is deliberate
  }),
);

// Per-uid chat limit — the hard cost control (DESIGN §8 N4). 20 turns/min is far
// above any human rate; state is per-instance (see rate-limit-core.ts caveat).
const chatLimiter = createRateLimiter({ limit: 20, windowMs: 60 * 1000 });
// Per-API-key limit for the licensed /v1 API (higher than a single human, still a
// cost ceiling; per-instance like chatLimiter).
const apiKeyLimiter = createRateLimiter({ limit: 60, windowMs: 60 * 1000 });

/**
 * Read the server-owned entitlement for `uid`. On any database error, resolve to
 * `null` (treated as free) — failing toward the cheap path keeps a transient blip
 * from handing out the Pro model / unlimited chat. The per-uid burst limiter
 * remains the hard cost backstop either way.
 */
async function readEntitlement(uid: string): Promise<Entitlement | null> {
  try {
    return await getEntitlement(uid);
  } catch (err) {
    console.error("entitlement read failed", { uid, err });
    return null;
  }
}

/**
 * The `chat_usage` key for an anonymous caller: `anon:<hash>` where the
 * hash is a truncated SHA-256 of the client IP. We never persist a raw IP (PDPL) —
 * the hash is a stable-per-IP-per-day-ish bucket, enough to cap a not-signed-in
 * visitor's daily allowance without storing personal data. An absent IP collapses to
 * a single shared `anon:none` bucket (conservative — worst case is one shared cap).
 */
function anonQuotaKey(ip: string | undefined): string {
  const hash = createHash("sha256")
    .update(ip || "none")
    .digest("hex")
    .slice(0, 32);
  return `anon:${hash}`;
}

/**
 * Atomically consume one daily question for `key` — a single conditional UPSERT on
 * `chat_usage`, so the allowance is durable across instances and can't be reset by
 * clearing localStorage or spreading load. `key` is the caller's `uid` (signed-in)
 * or an `anon:<ipHash>` bucket. On a database error it fails open (allowed); the
 * per-uid/per-IP burst limiter is the hard backstop.
 */
async function consumeDailyQuota(
  key: string,
  limit: number,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const now = new Date();
  try {
    const count = await consumeDailyQuotaRow(key, dayKey(now), limit);
    return { allowed: count !== null, retryAfterSec: secondsUntilUtcReset(now) };
  } catch (err) {
    console.error("chat quota update failed", { key, err });
    return { allowed: true, retryAfterSec: 0 };
  }
}

/**
 * Spend one purchased Captain Adel credit for `uid` — used only after the daily
 * free allowance is exhausted. Returns true when a credit was spent, false when the
 * balance is empty. On a database error returns false (fail closed): this path is
 * only reached after a successful quota read, so a failure here is rare and the
 * caller just 429s.
 */
async function consumeCredit(uid: string): Promise<boolean> {
  try {
    return await spendOneChatCredit(uid);
  } catch (err) {
    console.error("chat credit update failed", { uid, err });
    return false;
  }
}

app.post(["/chat", "/api/chat"], async (req: Request, res: Response): Promise<void> => {
  // Auth / App Check. Captain Adel chat is usable WITHOUT an account: an absent or
  // invalid ID token yields an anonymous caller (metered by hashed client IP on a
  // small daily free-trial allowance), not a 401. App Check failures still 403,
  // enforced only when ENFORCE_APP_CHECK is on.
  let uid: string | undefined;
  let emailVerified: boolean;
  try {
    ({ uid, emailVerified } = await authenticate(req));
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(403).json({ error: err.message });
      return;
    }
    throw err;
  }

  // Per-turn burst limiter — the hard cost backstop (DESIGN §8 N4). Keyed on the uid
  // when signed in, else on the client IP so one anonymous visitor can't flood.
  const limiterKey = uid ? `uid:${uid}` : `ip:${req.ip ?? "none"}`;
  const verdict = chatLimiter.check(limiterKey);
  if (!verdict.allowed) {
    res.setHeader("Retry-After", String(verdict.retryAfterSec));
    res.status(429).json({ error: RATE_LIMITED });
    return;
  }

  const parsed = parseRequest(req.body);
  if (!parsed) {
    res.status(400).json({
      error: `invalid request: 'message' is required (max ${MESSAGE_MAX_CHARS} chars)`,
    });
    return;
  }

  // Quota / plan gate — the server is the source of truth (DESIGN §8). The client's
  // localStorage counter and Pro toggle are only UI nudges. Checked after
  // parseRequest so a malformed turn never burns quota.
  if (!uid) {
    // Anonymous: a small daily free-trial allowance, metered per hashed IP, always on
    // the flash model. No entitlement and no credits — there's no account to bill;
    // when the trial is spent the client nudges the visitor to sign in.
    parsed.provider = undefined; // never the Pro model for an anonymous caller
    const quota = await consumeDailyQuota(anonQuotaKey(req.ip), ANON_DAILY_LIMIT_ENFORCED);
    if (!quota.allowed) {
      console.info("funnel", { event: "anon_quota_exhausted" });
      res.setHeader("Retry-After", String(quota.retryAfterSec));
      res.status(429).json({ error: QUOTA_EXCEEDED });
      return;
    }
  } else {
    // Signed-in: free users are held to the daily free-question allowance and never
    // get the Pro model regardless of what the client sends; paid users bypass both.
    const paid = isPaidActive(await readEntitlement(uid));
    if (!paid) {
      parsed.provider = undefined; // collapse a client-requested 'pro' tier to flash
      const quota = await consumeDailyQuota(uid, FREE_DAILY_LIMIT_ENFORCED);
      // Past the daily free allowance a purchased credit (if any) covers the turn;
      // only 429 when neither free questions nor credits remain.
      if (!quota.allowed) {
        const credit = await consumeCredit(uid);
        // Structured funnel events (Cloud Logging → offline conversion analysis):
        // hitting the wall is the upsell moment; a spent credit is micro-revenue.
        // `emailVerified` lets us segment conversion by verified-vs-unverified sign-up.
        console.info("funnel", {
          event: credit ? "credit_spent" : "quota_exhausted",
          uid,
          emailVerified,
        });
        if (!credit) {
          res.setHeader("Retry-After", String(quota.retryAfterSec));
          res.status(429).json({ error: QUOTA_EXCEEDED });
          return;
        }
      }
    }
  }

  const streaming = req.query.stream === "1";

  if (!streaming) {
    // Buffered path — same flow, single JSON result.
    try {
      const out = await captainAdelFlow(parsed);
      res.json({
        answer: out.answer,
        sources: out.sources,
        kind: out.kind,
        refusalClass: out.refusalClass,
        meta: { provider: out.meta.provider },
      });
    } catch (err) {
      // 503 + a distinct code for "no endpoint configured": that is an expected
      // operating state, not a bug, and the client says so honestly rather than
      // showing a generic failure. Everything else stays an opaque 500.
      if (isUnconfigured(err)) {
        console.warn("chat unavailable (buffered): no model endpoint configured");
        res.status(503).json({ error: MODEL_UNCONFIGURED });
        return;
      }
      console.error("chat failed (buffered)", { err });
      res.status(500).json({ error: "chat failed" });
    }
    return;
  }

  // Streaming path — legacy SSE frame protocol.
  res.writeHead(200, SSE_HEADERS);
  res.write(pingFrame()); // open the stream promptly
  let aborted = false;
  req.on("close", () => {
    aborted = true;
  });

  try {
    const { stream, output } = captainAdelFlow.stream(parsed);
    for await (const delta of stream) {
      if (aborted) return; // client gone — stop consuming
      if (delta) res.write(frame({ type: "token", delta }));
    }
    if (aborted) return;
    const out = await output;
    res.write(
      frame({
        type: "final",
        answer: out.answer,
        sources: out.sources,
        kind: out.kind,
        refusalClass: out.refusalClass,
        meta: { provider: out.meta.provider },
      }),
    );
    res.write(doneFrame());
    res.end();
  } catch (err) {
    // The status line is already sent by now, so the reason has to travel in the
    // frame rather than the status code.
    const unconfigured = isUnconfigured(err);
    if (unconfigured) {
      console.warn("chat unavailable (stream): no model endpoint configured");
    } else {
      console.error("chat failed (stream)", { err });
    }
    if (!aborted) {
      res.write(frame({ type: "error", code: unconfigured ? MODEL_UNCONFIGURED : STREAM_FAILED }));
      res.write(doneFrame());
      res.end();
    }
  }
});

// Licensed Captain Adel API (DESIGN — data/API licensing). External callers (LMS
// vendors, schools' portals) authenticate with a minted API key — not a Firebase
// user or App Check — and receive a plain buffered JSON answer + citations. The key
// is looked up by hash, rate-limited and metered per key. Streaming, history and
// the Pro tier stay app-only; this surface is deliberately minimal.
app.post(["/v1/ask", "/api/v1/ask"], async (req: Request, res: Response): Promise<void> => {
  const key = extractApiKey(req.header("authorization"), req.header("x-api-key"));
  if (!key) {
    res.status(401).json({ error: "api key required" });
    return;
  }
  const hash = hashApiKey(key);

  const verdict = apiKeyLimiter.check(`key:${hash}`);
  if (!verdict.allowed) {
    res.setHeader("Retry-After", String(verdict.retryAfterSec));
    res.status(429).json({ error: RATE_LIMITED });
    return;
  }

  // Key row (auth + tier) and the month's meter, read together.
  const month = monthKey(new Date());
  const [keyRow, usageRow] = await Promise.all([
    queryOne<{ id: string; tier: string; revoked_at: Date | null }>(
      "SELECT id, tier, revoked_at FROM api_keys WHERE digest = $1",
      [hash],
    ),
    queryOne<{ count: number }>(
      "SELECT count FROM api_usage WHERE digest = $1 AND month = $2",
      [hash, month],
    ),
  ]);
  if (!keyRow || keyRow.revoked_at !== null) {
    res.status(401).json({ error: "invalid api key" });
    return;
  }

  // Tier monthly-quota gate. The plan's answer allowance is the metered value we sell;
  // a key with no `tier` defaults to enterprise (uncapped) so legacy keys aren't
  // throttled. The per-minute rate limiter above is a separate, coarse safety net.
  const tier = apiTier(keyRow.tier);
  const usedThisMonth = usageRow?.count ?? 0;
  const quota = API_TIERS[tier].monthlyQuota;
  if (quota !== null) {
    res.setHeader("X-Quota-Limit", String(quota));
    res.setHeader("X-Quota-Used", String(usedThisMonth));
  }
  if (isOverMonthlyQuota(usedThisMonth, tier)) {
    res.status(429).json({ error: "monthly_quota_exceeded", tier, quota });
    return;
  }

  const parsed = parseRequest(req.body);
  if (!parsed) {
    res.status(400).json({
      error: `invalid request: 'message' is required (max ${MESSAGE_MAX_CHARS} chars)`,
    });
    return;
  }
  // History and the Pro tier are app-only (see the header note), and neither was
  // actually being stripped. `provider` is a cost leak — any tier could request the
  // Pro model at the flash price. `history` is worse: nothing proves an `assistant`
  // turn came from us, so a caller could feed back 12 forged model turns and talk
  // this surface out of its own guardrails, then render the result to students as
  // regulation.
  parsed.provider = undefined;
  parsed.history = undefined;

  // Meter per key, bucketed by calendar month (best-effort; the quota gate above reads
  // the month bucket, billing reads it offline). Never blocks the answer on the write.
  void query(
    `INSERT INTO api_usage (digest, month, count, last_used_at)
     VALUES ($1, $2, 1, now())
     ON CONFLICT (digest, month) DO UPDATE SET
       count = api_usage.count + 1, last_used_at = now()`,
    [hash, month],
  ).catch((err) => console.error("api usage metering failed", { err }));

  const remaining = remainingThisMonth(usedThisMonth + 1, tier);
  if (remaining !== null) res.setHeader("X-Quota-Remaining", String(remaining));

  try {
    const out = await captainAdelFlow(parsed);
    res.json({
      answer: out.answer,
      sources: out.sources,
      kind: out.kind,
      refusalClass: out.refusalClass,
      meta: { provider: out.meta.provider },
    });
  } catch (err) {
    // Licensed partners get a real reason: 503 is retryable and tells them the
    // fault is ours, where a bare 500 "ask failed" reads as a bad request.
    if (isUnconfigured(err)) {
      console.warn("v1/ask unavailable: no model endpoint configured");
      res.status(503).json({ error: MODEL_UNCONFIGURED });
      return;
    }
    console.error("v1/ask failed", { err });
    res.status(500).json({ error: "ask failed" });
  }
});

// 👍/👎 on an answer, persisted to `answer_feedback` for offline quality review.
app.post(["/feedback", "/api/feedback"], async (req: Request, res: Response): Promise<void> => {
  let uid: string | undefined;
  try {
    ({ uid } = await authenticate(req));
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(403).json({ error: err.message });
      return;
    }
    throw err;
  }

  const fb = parseFeedback(req.body);
  if (!fb) {
    res.status(400).json({ error: "invalid request: 'rating' must be 'up' or 'down'" });
    return;
  }

  // Best-effort — a feedback write must never disrupt the chat.
  await recordAnswerFeedback({ userId: uid ?? null, ...fb }).catch((err) =>
    console.error("feedback write failed", { err }),
  );
  res.status(204).end();
});

/** JSON 404 for unknown paths (the raw function URL has no SPA fallback). Exported for tests. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "not found" });
}

/**
 * Final safety net — Express 5 forwards rejected async handlers here (e.g. a
 * non-AuthError rethrow from `authenticate`); the in-route try/catches stay
 * primary. Never leak the error to the client; if headers are already out
 * (mid-SSE) just terminate the stream rather than corrupt it. Exported for tests.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express detects error middleware by arity(4)
  _next: NextFunction,
): void {
  console.error("gateway unhandled error", { path: req.path, err });
  if (res.headersSent) {
    res.end();
    return;
  }
  res.status(500).json({ error: "internal error" });
}

export default app;
