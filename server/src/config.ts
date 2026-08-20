/**
 * Environment configuration — the single place the server reads `process.env`.
 *
 * This replaces the `defineString`/`defineInt`/`defineBoolean` params the Cloud
 * Functions build used. On Cloud Run everything arrives as a plain env var, with
 * secrets mounted from Secret Manager (see docs/RUNBOOK-deploy.md).
 *
 * `requireEnv` throws at boot rather than at first request, so a misconfigured
 * revision fails its health check instead of silently 500-ing later.
 */

function str(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * The guarded integer reader, for the few modules that read a knob directly
 * rather than through `config`.
 *
 * Treating an EMPTY value as "use the fallback" is the whole point: `--set-env-vars
 * FOO=` yields an empty string, and `Number("")` is 0, not NaN. A hand-rolled
 * `Number(process.env.FOO ?? fallback)` therefore silently resolves to 0 — which,
 * for a quota or a threshold, means "off".
 */
export { int as envInt };

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return raw === "1" || raw.toLowerCase() === "true";
}

/** Read a required var, throwing a named error at boot when it is absent. */
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const config = {
  /** Cloud Run supplies PORT; 8080 is its default contract. */
  port: int("PORT", 8080),

  /**
   * Proxy hops in front of the app, counted from the socket inwards — this is
   * what `req.ip` resolves to, and every rate limiter keys off it.
   *
   * 2 is correct for production (client -> GCP HTTPS load balancer -> Cloud Run,
   * arriving as `X-Forwarded-For: <client>, <lb>`). It also degrades correctly to
   * the client address on a direct *.run.app request. Override only if you put
   * another proxy in front; never set it high enough to trust a client-sent XFF.
   */
  trustProxyHops: int("TRUST_PROXY_HOPS", 2),
  nodeEnv: str("NODE_ENV", "development"),
  isProduction: str("NODE_ENV", "development") === "production",

  /** Public origin of the SPA — used for OAuth redirects and cookie domain. */
  appOrigin: str("APP_ORIGIN", "http://localhost:5173"),
  /** Public origin of this API — used to build the OAuth callback URL. */
  apiOrigin: str("API_ORIGIN", "http://localhost:8080"),

  db: {
    /** Full connection string. On Cloud Run use the Cloud SQL unix socket host. */
    url: str("DATABASE_URL"),
    /** Max pool size — keep low, Cloud Run scales horizontally. */
    poolMax: int("DATABASE_POOL_MAX", 5),
  },

  session: {
    /** HS256 signing secret for session JWTs. Rotate via Secret Manager. */
    secret: str("SESSION_SECRET"),
    /** Session lifetime in days. */
    ttlDays: int("SESSION_TTL_DAYS", 30),
    cookieName: str("SESSION_COOKIE_NAME", "fg_session"),
    /**
     * SameSite policy for the session cookie. `lax` unless you deliberately serve
     * the SPA from a different registrable domain than the API.
     *
     * This is an explicit knob because it is the site's only CSRF control — there
     * are no CSRF tokens. It used to be inferred from whether SESSION_COOKIE_DOMAIN
     * happened to be set, which conflated two unrelated decisions and defaulted
     * production to `none` (i.e. every cross-site request carrying the session) on
     * a deployment where the SPA and /api share one origin behind the load
     * balancer and `lax` is both correct and strictly safer.
     */
    sameSite: str("SESSION_COOKIE_SAMESITE", "lax").trim().toLowerCase() === "none"
      ? ("none" as const)
      : ("lax" as const),
    /** Set when the API and SPA share a registrable domain (e.g. `.flygaca.com`). */
    cookieDomain: str("SESSION_COOKIE_DOMAIN"),
  },

  google: {
    clientId: str("GOOGLE_OAUTH_CLIENT_ID"),
    clientSecret: str("GOOGLE_OAUTH_CLIENT_SECRET"),
  },

  /**
   * The Captain Adel model endpoint. OpenAI chat-completions shape, so it can be
   * pointed at any in-Kingdom provider — HUMAIN's ALLaM service (Groq inference
   * in Dammam) or a self-hosted ALLaM behind vLLM — without a code change.
   *
   * Deliberately has no default base URL. A wrong-but-plausible default would
   * send regulatory questions to whatever answered, and the whole reason this
   * replaced Gemini is that the destination must be a decision, not an accident.
   * The model ids must match the provider's own catalog.
   */
  model: {
    baseUrl: str("MODEL_BASE_URL"),
    apiKey: str("MODEL_API_KEY"),
    tiers: {
      fast: str("MODEL_ID_FAST", "allam-7b-instruct"),
      pro: str("MODEL_ID_PRO", "allam-34b-instruct"),
    },
  },

  mail: {
    /** Transactional email API key. When absent, mails are logged, not sent. */
    apiKey: str("MAIL_API_KEY"),
    from: str("MAIL_FROM", "Fly GACA <no-reply@flygaca.com>"),
    /** Base URL of the provider's send endpoint (Resend-compatible). */
    endpoint: str("MAIL_ENDPOINT", "https://api.resend.com/emails"),
  },

  moyasar: {
    secretKey: str("MOYASAR_SECRET_KEY"),
    webhookSecret: str("MOYASAR_WEBHOOK_SECRET"),
  },

  /** Shared secret the Cloud Scheduler renewal job presents. */
  cronSecret: str("CRON_SECRET"),

  chat: {
    /** Free questions per day for a signed-in free-tier user. */
    freeDailyLimit: int("CHAT_FREE_DAILY_LIMIT", 5),
    /** Questions per purchased credit pack. Mirrors src/lib/services/billing.ts. */
    creditPackSize: int("CHAT_CREDIT_PACK_SIZE", 50),
    /** Kill switch for the chat gateway. */
    enabled: bool("CHAT_ENABLED", true),
  },

  /** Extra CORS origins beyond the built-in allowlist, comma-separated. */
  extraAllowedOrigins: str("EXTRA_ALLOWED_ORIGINS")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
} as const;

/**
 * Fail fast on anything the service cannot run without. Called from `index.ts`
 * before the listener binds, so a bad revision never passes its health check.
 */
export function assertRequiredConfig(): void {
  requireEnv("DATABASE_URL");
  requireEnv("SESSION_SECRET");
  if (config.session.secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  if (!config.isProduction) return;

  // APP_ORIGIN and API_ORIGIN default to localhost so `npm run dev` needs no
  // setup. In production those defaults are not merely wrong, they are invisible:
  // the revision boots, passes its health check, and then emails verification and
  // password-reset links pointing at localhost, sends Google a localhost
  // redirect_uri, and hands Moyasar a localhost callback_url after taking a real
  // payment. Nothing downstream can detect it, so it has to fail here.
  for (const [name, value] of [
    ["APP_ORIGIN", config.appOrigin],
    ["API_ORIGIN", config.apiOrigin],
  ] as const) {
    let host: string;
    try {
      host = new URL(value).hostname;
    } catch {
      throw new Error(`${name} must be an absolute URL in production (got: ${value || "empty"})`);
    }
    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
      throw new Error(
        `${name} is still ${value} in production. Set it to the public origin ` +
          "(e.g. https://flygaca.com) — see docs/RUNBOOK-deploy.md.",
      );
    }
    if (!value.startsWith("https://")) {
      throw new Error(`${name} must be https:// in production (got: ${value})`);
    }
  }
}

/**
 * Config that is absent but does not justify refusing to boot.
 *
 * Each of these fails CLOSED at the point of use — no permissive fallback — but
 * fails *quietly*: no mail is sent, every webhook 401s, every checkout 500s, the
 * renewal sweep 401s and subscriptions lapse. The common thread is that a user, a
 * payment processor or a scheduler discovers the problem long before an operator
 * does. Returning them here lets `index.ts` say so once, loudly, at boot.
 *
 * These are warnings rather than throws deliberately: refusing to start would take
 * down auth, the library and the whole account surface over one unconfigured
 * feature, which is a worse outcome than running degraded and saying so.
 */
export function missingProductionConfig(): string[] {
  if (!config.isProduction) return [];
  const gaps: string[] = [];
  const note = (present: unknown, msg: string) => {
    if (!present) gaps.push(msg);
  };
  note(config.mail.apiKey, "MAIL_API_KEY — email verification and password reset will never be delivered");
  note(config.moyasar.secretKey, "MOYASAR_SECRET_KEY — every checkout will fail with billing-unavailable");
  note(config.moyasar.webhookSecret, "MOYASAR_WEBHOOK_SECRET — every Moyasar webhook will be rejected, so paid orders will never be fulfilled");
  note(config.cronSecret, "CRON_SECRET — the renewal job will be rejected, so subscriptions will silently lapse");
  note(config.google.clientId, "GOOGLE_OAUTH_CLIENT_ID — Google sign-in will return auth/operation-not-allowed");
  note(config.google.clientSecret, "GOOGLE_OAUTH_CLIENT_SECRET — the Google token exchange will fail");
  return gaps;
}
