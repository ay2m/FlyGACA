/**
 * `server/src/session.ts` — the auth primitives the whole API rests on: scrypt
 * password hashing, the HS256 session JWT, the session cookie attributes, and
 * the opaque verification/reset tokens.
 *
 * These are pure (node crypto + jose, no database, no network) yet the module
 * sat at 7% coverage, so every rule below was previously unasserted: that a
 * wrong password is rejected, that a token signed with someone else's secret is
 * not accepted, that the cookie goes `Secure` in production, and that only the
 * digest of a reset token is ever stored.
 *
 * `config` reads `process.env` once at import, so the cookie tests reload the
 * module per environment (`vi.resetModules()` + dynamic import) — the same
 * pattern as corpus-loader.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { SignJWT } from "jose";

const SECRET = "test-session-secret-please-rotate";

/** Load session.ts under a specific environment. */
async function loadSession(env: Record<string, string> = {}) {
  vi.resetModules();
  process.env.SESSION_SECRET = SECRET;
  delete process.env.NODE_ENV;
  delete process.env.SESSION_COOKIE_DOMAIN;
  delete process.env.SESSION_TTL_DAYS;
  Object.assign(process.env, env);
  return import("../src/session.js");
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.SESSION_SECRET = SECRET;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("hashPassword + verifyPassword", () => {
  it("stores scrypt$<saltHex>$<hashHex> and round-trips the right password", async () => {
    const { hashPassword, verifyPassword } = await loadSession();
    const stored = await hashPassword("correct horse battery staple");

    const [scheme, saltHex, hashHex] = stored.split("$");
    expect(scheme).toBe("scrypt");
    expect(saltHex).toMatch(/^[0-9a-f]{32}$/); // 16 random bytes
    expect(hashHex).toMatch(/^[0-9a-f]{128}$/); // SCRYPT_KEYLEN = 64 bytes

    await expect(verifyPassword("correct horse battery staple", stored)).resolves.toBe(true);
  });

  it("salts per call, so the same password never yields the same record", async () => {
    const { hashPassword, verifyPassword } = await loadSession();
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");

    expect(a).not.toBe(b);
    // Both still verify — the salt lives in the record, not in a shared secret.
    await expect(verifyPassword("same-password", a)).resolves.toBe(true);
    await expect(verifyPassword("same-password", b)).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const { hashPassword, verifyPassword } = await loadSession();
    const stored = await hashPassword("right");
    await expect(verifyPassword("wrong", stored)).resolves.toBe(false);
    // Near-misses too — no prefix/length shortcut.
    await expect(verifyPassword("right ", stored)).resolves.toBe(false);
    await expect(verifyPassword("Right", stored)).resolves.toBe(false);
    await expect(verifyPassword("", stored)).resolves.toBe(false);
  });

  it("returns false (never throws) for an account with no password hash", async () => {
    const { verifyPassword } = await loadSession();
    // An OAuth-only account has a null hash — password sign-in must simply fail.
    await expect(verifyPassword("anything", null)).resolves.toBe(false);
  });

  it("returns false for a malformed stored record rather than throwing", async () => {
    const { verifyPassword } = await loadSession();
    for (const stored of [
      "",
      "not-a-record",
      "bcrypt$abcd$ef01", // wrong scheme
      "scrypt$$", // empty salt and hash
      "scrypt$abcd", // missing hash segment
      "scrypt$$abcd", // missing salt
    ]) {
      await expect(verifyPassword("pw", stored)).resolves.toBe(false);
    }
  });

  it("rejects a corrupt digest instead of accepting every password", async () => {
    const { verifyPassword } = await loadSession();
    // Regression guard. `Buffer.from(s, "hex")` truncates at the first non-hex
    // character, so these decode to fewer bytes than they claim. Before the
    // length check in verifyPassword, "scrypt$zzzz$zzzz" decoded to zero bytes,
    // scrypt derived a zero-length key, and timingSafeEqual called two empty
    // buffers equal — so any password authenticated against a corrupt row.
    for (const password of ["pw", "", "totally-wrong", "another guess"]) {
      await expect(verifyPassword(password, "scrypt$zzzz$zzzz")).resolves.toBe(false);
      await expect(verifyPassword(password, "scrypt$abcd$abZZ")).resolves.toBe(false);
    }
  });

  it("rejects a digest of the wrong length", async () => {
    const { hashPassword, verifyPassword } = await loadSession();
    const stored = await hashPassword("pw");
    const [, saltHex, hashHex] = stored.split("$");

    // Valid hex, but truncated or padded away from the 64 bytes we write.
    await expect(verifyPassword("pw", `scrypt$${saltHex}$${hashHex.slice(0, 100)}`)).resolves.toBe(
      false,
    );
    await expect(verifyPassword("pw", `scrypt$${saltHex}$${hashHex}00`)).resolves.toBe(false);
    // The untouched record still verifies.
    await expect(verifyPassword("pw", stored)).resolves.toBe(true);
  });
});

describe("signSession + verifySession", () => {
  it("round-trips the uid", async () => {
    const { signSession, verifySession } = await loadSession();
    const token = await signSession("user-123");
    await expect(verifySession(token)).resolves.toBe("user-123");
  });

  it("returns null for an absent token", async () => {
    const { verifySession } = await loadSession();
    await expect(verifySession(undefined)).resolves.toBeNull();
    await expect(verifySession("")).resolves.toBeNull();
  });

  it("returns null for a malformed or tampered token", async () => {
    const { signSession, verifySession } = await loadSession();
    const token = await signSession("user-123");

    await expect(verifySession("not-a-jwt")).resolves.toBeNull();

    const [header, payload, signature] = token.split(".");

    // A valid shape with a bad signature. Flip the FIRST signature character,
    // not the last: a 32-byte HMAC is 43 base64url characters, whose final
    // character carries 4 significant bits plus 2 that the decoder discards —
    // so flipping it can leave the decoded signature byte-identical.
    const resigned = `${header}.${payload}.${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
    await expect(verifySession(resigned)).resolves.toBeNull();

    // A rewritten payload — claiming to be someone else — under the original
    // signature.
    const asOther = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), sub: "admin" }),
    ).toString("base64url");
    await expect(verifySession(`${header}.${asOther}.${signature}`)).resolves.toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const { verifySession } = await loadSession();
    const forged = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-123")
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(new TextEncoder().encode("some-other-secret"));

    await expect(verifySession(forged)).resolves.toBeNull();
  });

  it("rejects an expired token", async () => {
    const { verifySession } = await loadSession();
    const expired = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-123")
      .setIssuedAt(0)
      .setExpirationTime(1) // 1970 — long past
      .sign(new TextEncoder().encode(SECRET));

    await expect(verifySession(expired)).resolves.toBeNull();
  });

  it("returns null when the token carries no string subject", async () => {
    const { verifySession } = await loadSession();
    const subjectless = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(new TextEncoder().encode(SECRET));

    await expect(verifySession(subjectless)).resolves.toBeNull();
  });

  it("honours SESSION_TTL_DAYS in the token's exp claim", async () => {
    const { signSession } = await loadSession({ SESSION_TTL_DAYS: "7" });
    const token = await signSession("user-123");
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    ) as { iat: number; exp: number };

    expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60);
  });
});

describe("sessionCookieOptions", () => {
  it("is HttpOnly and root-scoped everywhere", async () => {
    const { sessionCookieOptions } = await loadSession();
    const opts = sessionCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe("/");
  });

  it("stays permissive in development — no Secure, SameSite=Lax, no domain", async () => {
    const { sessionCookieOptions } = await loadSession();
    const opts = sessionCookieOptions();
    expect(opts.secure).toBe(false);
    expect(opts.sameSite).toBe("lax");
    expect(opts.domain).toBeUndefined();
  });

  it("goes Secure + SameSite=None in production when the SPA is cross-site", async () => {
    // No SESSION_COOKIE_DOMAIN => the API and SPA are on different registrable
    // domains, so the cookie has to be sent cross-site.
    const { sessionCookieOptions } = await loadSession({ NODE_ENV: "production" });
    const opts = sessionCookieOptions();
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe("none");
    expect(opts.domain).toBeUndefined();
  });

  it("keeps the stricter SameSite=Lax in production on a shared parent domain", async () => {
    const { sessionCookieOptions } = await loadSession({
      NODE_ENV: "production",
      SESSION_COOKIE_DOMAIN: ".flygaca.com",
    });
    const opts = sessionCookieOptions();
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.domain).toBe(".flygaca.com");
  });

  it("expresses maxAge in milliseconds, as res.cookie() expects", async () => {
    // Express converts to the seconds the Set-Cookie header wants; handing it
    // seconds here would shorten a 30-day session to 43 minutes.
    const { sessionCookieOptions } = await loadSession({ SESSION_TTL_DAYS: "30" });
    expect(sessionCookieOptions().maxAge).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe("generateOpaqueToken + hashToken", () => {
  it("returns a URL-safe token alongside its stored digest", async () => {
    const { generateOpaqueToken, hashToken } = await loadSession();
    const { token, digest } = generateOpaqueToken();

    // base64url of 32 random bytes: no +, / or = to mangle in a link.
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(digest).toBe(hashToken(token));
  });

  it("never repeats a token", async () => {
    const { generateOpaqueToken } = await loadSession();
    const tokens = new Set(Array.from({ length: 25 }, () => generateOpaqueToken().token));
    expect(tokens.size).toBe(25);
  });

  it("stores only the SHA-256 digest, so a database read cannot mint a link", async () => {
    const { generateOpaqueToken } = await loadSession();
    const { token, digest } = generateOpaqueToken();

    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).not.toBe(token);
    expect(digest).toBe(createHash("sha256").update(token).digest("hex"));
  });

  it("hashToken is deterministic and distinguishes near-identical inputs", async () => {
    const { hashToken } = await loadSession();
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
});
