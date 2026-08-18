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
import { config, assertRequiredConfig } from "./config.js";
import { isAllowedOrigin } from "./gateway-core.js";
import { withSession, errorMiddleware, handler } from "./http.js";
import { ping } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { accountRouter } from "./routes/account.js";
import { grantsRouter } from "./routes/grants.js";
import { billingRouter } from "./routes/billing.js";
import { orgRouter } from "./routes/org.js";
import { addToWaitlist } from "./store.js";
import gateway from "./gateway.js";

declare module "express-serve-static-core" {
  interface Request {
    /** Raw request body, kept for the Moyasar webhook's signature check. */
    rawBody?: string;
  }
}

export const app = express();

app.use(helmet());
// req.ip = the client address one hop back. Trusting only the LAST hop (the Cloud
// Run / Google edge proxy) means a client-supplied X-Forwarded-For is ignored —
// leftmost-XFF would let a forger mint unlimited fresh per-IP buckets for the
// anonymous chat quota and the rate limiters.
app.set("trust proxy", 1);

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

/** Cloud Run health check — also validates the database connection. */
app.get(
  "/healthz",
  handler(async (_req, res) => {
    const db = await ping();
    return res.status(db ? 200 : 503).json({ ok: db });
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
  app.listen(config.port, () => {
    console.info(`Fly GACA API listening on :${config.port} (${config.nodeEnv})`);
  });
}

export default app;
