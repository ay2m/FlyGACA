/**
 * `server/src/config.ts` — the single place the server reads `process.env`, and
 * the only thing standing between a misconfigured revision and a silent
 * production failure.
 *
 * Every rule here exists because of a failure mode that is invisible at runtime:
 * a revision that boots happily and then emails localhost links, or a threshold
 * that reads as 0 because the empty string is not undefined. `config` reads the
 * environment once at import, so each case reloads the module under a specific
 * environment (`vi.resetModules()` + dynamic import) — the same pattern as
 * session.test.ts.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const SECRET = "test-session-secret-please-rotate-x";
const ORIGINAL_ENV = { ...process.env };

/** Load config.ts under a specific environment, with the two hard requirements met. */
async function loadConfig(env: Record<string, string | undefined> = {}) {
  vi.resetModules();
  for (const k of Object.keys(process.env)) {
    if (/^(NODE_ENV|APP_ORIGIN|API_ORIGIN|DATABASE_URL|SESSION_|TRUST_PROXY|MAIL_|MOYASAR_|CRON_|GOOGLE_OAUTH_|ANON_|RETRIEVE_)/.test(k)) {
      delete process.env[k];
    }
  }
  process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/db";
  process.env.SESSION_SECRET = SECRET;
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return import("../src/config.js");
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("envInt", () => {
  it("treats an EMPTY value as absent, not as zero", async () => {
    // The whole reason this helper is exported. `--set-env-vars FOO=` sets an
    // empty string, and `Number("")` is 0 — so a hand-rolled reader turns an
    // unset quota into "off" and an unset threshold into "never refuse".
    const { envInt } = await loadConfig({ ANON_DAILY_LIMIT: "" });
    expect(envInt("ANON_DAILY_LIMIT", 3)).toBe(3);
  });

  it("falls back when unset or unparseable, and parses a real value", async () => {
    const { envInt } = await loadConfig({ ANON_DAILY_LIMIT: "7" });
    expect(envInt("ANON_DAILY_LIMIT", 3)).toBe(7);
    expect(envInt("DEFINITELY_NOT_SET_ANYWHERE", 3)).toBe(3);
    process.env.ANON_DAILY_LIMIT = "not-a-number";
    expect(envInt("ANON_DAILY_LIMIT", 3)).toBe(3);
  });
});

describe("trustProxyHops", () => {
  it("defaults to 2 — the GCP load balancer topology", async () => {
    // client -> HTTPS LB -> Cloud Run arrives as `X-Forwarded-For: <client>, <lb>`,
    // and Express counts the socket peer as hop 0. At 1, req.ip resolved to the
    // load balancer and every rate limiter shared one global bucket.
    const { config } = await loadConfig();
    expect(config.trustProxyHops).toBe(2);
  });

  it("is overridable for a different proxy chain", async () => {
    const { config } = await loadConfig({ TRUST_PROXY_HOPS: "3" });
    expect(config.trustProxyHops).toBe(3);
  });
});

describe("session.sameSite", () => {
  it("defaults to lax, independently of whether a cookie domain is set", async () => {
    // These are two unrelated questions. Deriving SameSite from the presence of
    // SESSION_COOKIE_DOMAIN defaulted production to `none`, and SameSite is the
    // only CSRF control this codebase has.
    const bare = await loadConfig({ NODE_ENV: "production" });
    expect(bare.config.session.sameSite).toBe("lax");
    const domained = await loadConfig({
      NODE_ENV: "production",
      SESSION_COOKIE_DOMAIN: ".flygaca.com",
    });
    expect(domained.config.session.sameSite).toBe("lax");
  });

  it("goes none only on an explicit, case-insensitive opt-in", async () => {
    const { config } = await loadConfig({ SESSION_COOKIE_SAMESITE: "NONE" });
    expect(config.session.sameSite).toBe("none");
  });

  it("treats anything else as lax rather than passing it through", async () => {
    const { config } = await loadConfig({ SESSION_COOKIE_SAMESITE: "strict" });
    expect(config.session.sameSite).toBe("lax");
  });
});

describe("assertRequiredConfig", () => {
  it("requires DATABASE_URL and a long-enough SESSION_SECRET", async () => {
    const noDb = await loadConfig({ DATABASE_URL: undefined });
    expect(() => noDb.assertRequiredConfig()).toThrow(/DATABASE_URL/);

    const shortSecret = await loadConfig({ SESSION_SECRET: "too-short" });
    expect(() => shortSecret.assertRequiredConfig()).toThrow(/at least 32/);
  });

  it("leaves localhost origins alone outside production", async () => {
    // `npm run dev` must need no setup; the defaults are localhost on purpose.
    const { assertRequiredConfig } = await loadConfig();
    expect(() => assertRequiredConfig()).not.toThrow();
  });

  it.each(["APP_ORIGIN", "API_ORIGIN"])(
    "refuses to boot in production when %s is still localhost",
    async (name) => {
      // This is the failure this check exists for: the revision passes its health
      // check, then emails localhost verification links, sends Google a localhost
      // redirect_uri, and hands Moyasar a localhost callback_url AFTER taking a
      // real payment. Nothing downstream can detect it.
      const other = name === "APP_ORIGIN" ? "API_ORIGIN" : "APP_ORIGIN";
      const { assertRequiredConfig } = await loadConfig({
        NODE_ENV: "production",
        [other]: "https://flygaca.com",
        [name]: "http://localhost:5173",
      });
      expect(() => assertRequiredConfig()).toThrow(new RegExp(name));
    },
  );

  it("refuses a plain-http or malformed origin in production", async () => {
    const insecure = await loadConfig({
      NODE_ENV: "production",
      APP_ORIGIN: "http://flygaca.com",
      API_ORIGIN: "https://flygaca.com",
    });
    expect(() => insecure.assertRequiredConfig()).toThrow(/https/);

    const malformed = await loadConfig({
      NODE_ENV: "production",
      APP_ORIGIN: "flygaca.com",
      API_ORIGIN: "https://flygaca.com",
    });
    expect(() => malformed.assertRequiredConfig()).toThrow(/absolute URL/);
  });

  it("accepts a correctly configured production revision", async () => {
    const { assertRequiredConfig } = await loadConfig({
      NODE_ENV: "production",
      APP_ORIGIN: "https://flygaca.com",
      API_ORIGIN: "https://flygaca.com",
    });
    expect(() => assertRequiredConfig()).not.toThrow();
  });
});

describe("missingProductionConfig", () => {
  const PROD = {
    NODE_ENV: "production",
    APP_ORIGIN: "https://flygaca.com",
    API_ORIGIN: "https://flygaca.com",
  };

  it("says nothing outside production", async () => {
    const { missingProductionConfig } = await loadConfig();
    expect(missingProductionConfig()).toEqual([]);
  });

  it("names every fail-closed-but-quiet secret that is unset", async () => {
    // Each of these fails closed at the point of use — no permissive fallback —
    // but fails silently: no mail sent, every webhook 401d, every checkout 500d,
    // the renewal sweep 401ing subscriptions into lapsing. A user or a payment
    // processor finds out long before an operator does.
    const { missingProductionConfig } = await loadConfig(PROD);
    const gaps = missingProductionConfig().join("\n");
    for (const name of [
      "MAIL_API_KEY",
      "MOYASAR_SECRET_KEY",
      "MOYASAR_WEBHOOK_SECRET",
      "CRON_SECRET",
      "GOOGLE_OAUTH_CLIENT_ID",
      "GOOGLE_OAUTH_CLIENT_SECRET",
    ]) {
      expect(gaps).toContain(name);
    }
  });

  it("says nothing when they are all configured", async () => {
    const { missingProductionConfig } = await loadConfig({
      ...PROD,
      MAIL_API_KEY: "k",
      MOYASAR_SECRET_KEY: "sk_live_x",
      MOYASAR_WEBHOOK_SECRET: "whsec",
      CRON_SECRET: "cron",
      GOOGLE_OAUTH_CLIENT_ID: "id",
      GOOGLE_OAUTH_CLIENT_SECRET: "secret",
    });
    expect(missingProductionConfig()).toEqual([]);
  });

  it("is a warning surface, not a boot gate — the service still starts", async () => {
    // Deliberate: refusing to start would take down auth, the library and the
    // whole account surface over one unconfigured feature.
    const { assertRequiredConfig, missingProductionConfig } = await loadConfig(PROD);
    expect(missingProductionConfig().length).toBeGreaterThan(0);
    expect(() => assertRequiredConfig()).not.toThrow();
  });
});
