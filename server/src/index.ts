/**
 * Cloud Run entry point — the single manifest of the backend's HTTP surface.
 *
 * Replaces `functions/src/index.ts`. Where that file exported one trigger per
 * feature, this mounts one router per feature under `/api`:
 *   - `/api/auth/*`     — sessions, Google OAuth, verification, reset
 *   - `/api/account/*`  — profile, logbook, records, study progress
 *   - `/api/grants/*`   — staff / school-seat / founding complimentary grants
 *   - `/api/billing/*`  — Moyasar checkout, confirm, webhook, renewal job
 *   - `/api/org/*`      — B2B cohort dashboard
 *   - `/api/waitlist`   — notify-me capture
 *   - `/api/chat`, `/api/feedback`, `/v1/ask` — the Captain Adel gateway
 *
 * One container serves all of it, so the 18 MB corpus + BM25 index are loaded
 * once per instance and shared by both the chat and the licensed API paths.
 */
import express from "express";
import helmet from "helmet";
import { config, assertRequiredConfig, missingProductionConfig } from "./config.js";
import { isAllowedOrigin } from "./gateway-core.js";
import { withSession, errorMiddleware, handler } from "./http.js";
import { ping } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { accountRouter } from "./routes/account.js";
import { grantsRouter } from "./routes/grants.js";
import { billingRouter } from "./routes/billing.js";
import { orgRouter } from "./routes/org.js";
import { addToWaitlist } from "./store.js";
import { isModelConfigured } from "./model-core.js";
import gateway from "./gateway.js";

declare module "express-serve-static-core" {
  interface Request {
    /** Raw request body, kept for the Moyasar webhook's signature check. */
    rawBody?: string;
  }
}

export const app = express();

app.use(helmet());
// How many proxy hops sit in front of us, counted from the socket inwards. This
// decides what `req.ip` resolves to, and every rate limiter and the anonymous
// chat quota key off it.
//
// Production is client -> GCP HTTPS load balancer -> Cloud Run, which arrives as
// `X-Forwarded-For: <client>, <lb>`. Express counts the socket peer as hop 0, so
// the LB is hop 1 and the real client is hop 2 -- `trust proxy` must be 2 here.
// With 1 (the value this used to carry, correct only for a direct *.run.app hit)
// req.ip resolved to the LOAD BALANCER on every request, collapsing every limiter
// into a single global bucket: 20 failed logins per 15 minutes for the entire
// internet, and one shared 3-question/day anonymous chat allowance worldwide.
//
// 2 also degrades correctly on a direct *.run.app request (XFF is just `<client>`,
// and Express returns the leftmost entry when the chain is shorter than the hop
// count), and it still ignores a client-forged XFF prefix. Never use `true` --
// that trusts whatever the client sends.
app.set("trust proxy", config.trustProxyHops);

// The webhook signature is computed over the exact bytes Moyasar sent, so stash
// them before the parser discards the stream.
app.use(
  express.json({
    limit: "256kb",
    verify: (req, _res, buf) => {
      (req as express.Request).rawBody = buf.toString("utf8");
    },
  }),
);

// CORS — explicit allowlist (policy in `gateway-core.ts`), extended by
// EXTRA_ALLOWED_ORIGINS so a new front doesn't need a code change. Credentials are
// allowed because the session travels as a cookie, which makes reflecting an
// unvetted origin a real vulnerability rather than a nuisance.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) return next();
  if (!isAllowedOrigin(origin) && !config.extraAllowedOrigins.includes(origin)) {
    return res.status(403).json({ error: "CORS not allowed" });
  }
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Cron-Secret");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return next();
});

/**
 * Cloud Run health check — also validates the database connection.
 *
 * `model` reports whether Captain Adel has an endpoint to call, but does NOT
 * affect the status code: an unconfigured model is a degraded feature, not an
 * unhealthy service, and the library, tools, study, accounts and billing all
 * work without one. Returning 503 here would pull the whole revision out of
 * rotation over a feature that is deliberately off. Only the database failing
 * is fatal.
 */
app.get(
  "/healthz",
  handler(async (_req, res) => {
    const db = await ping();
    const model = isModelConfigured(config.model.baseUrl);
    return res.status(db ? 200 : 503).json({ ok: db, model });
  }),
);

app.use("/api/auth", withSession, authRouter);
app.use("/api/account", withSession, accountRouter);
app.use("/api/grants", withSession, grantsRouter);
app.use("/api/billing", withSession, billingRouter);
app.use("/api/org", withSession, orgRouter);

app.post(
  "/api/waitlist",
  handler(async (req, res) => {
    const email = String((req.body as { email?: unknown })?.email ?? "")
      .trim()
      .toLowerCase();
    const topic = (req.body as { topic?: unknown })?.topic;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "invalid-email" });
    }
    await addToWaitlist(email, typeof topic === "string" ? topic.slice(0, 120) : undefined);
    return res.status(201).json({ ok: true });
  }),
);

// The Captain Adel gateway keeps its own auth, rate limiting and quota handling —
// it serves anonymous callers by design, so it is mounted outside `withSession`.
app.use(gateway);

app.use(errorMiddleware);

// Tests import `app` directly; only a real run binds a port.
if (config.nodeEnv !== "test") {
  assertRequiredConfig();
  // Deliberately a warning, not part of assertRequiredConfig(): that throws before
  // listen(), and refusing to boot would take down auth, billing and the whole
  // account surface over one feature. Say it plainly in the log instead, so a
  // revision serving a silent Captain Adel is visible in Cloud Logging rather
  // than discovered by a user.
  if (!isModelConfigured(config.model.baseUrl)) {
    console.warn(
      "MODEL_BASE_URL is not set — Captain Adel will decline every question. " +
        "Everything else serves normally. See docs/RUNBOOK-golive.md.",
    );
  }
  // Same reasoning, applied to the rest of the fail-closed-but-quiet config. Each
  // of these breaks a whole feature at the point of use with nothing surfacing to
  // an operator — undelivered mail, rejected webhooks, a renewal sweep that 401s
  // itself into silently lapsed subscriptions. One loud line at boot turns "a user
  // reported it three weeks later" into "it is in the first page of the logs".
  for (const gap of missingProductionConfig()) {
    console.warn(`[config] ${gap}`);
  }
  app.listen(config.port, () => {
    console.info(`Fly GACA API listening on :${config.port} (${config.nodeEnv})`);
  });
}

export default app;
