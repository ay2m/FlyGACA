/**
 * `server/src/http.ts` — the plumbing every route depends on: the typed error
 * envelope, the async handler wrapper, the session-resolving middleware, and the
 * `requireUser` / `requireVerifiedUser` authorization guards.
 *
 * The guards decide who may touch an account, and the module sat at 15%
 * coverage, so none of it was asserted. `withSession` is the one part that
 * reaches outside itself — it calls `verifySession` and `findUserById` — so
 * those two are mocked and everything else runs for real.
 *
 * Express's `req`/`res` are duck-typed here rather than booted through the app;
 * these functions only touch `headers`, `user`, `status()` and `json()`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

const verifySession = vi.fn<(token: string | undefined) => Promise<string | null>>();
const findUserById = vi.fn<(uid: string) => Promise<unknown>>();

vi.mock("../src/session.js", () => ({ verifySession: (t?: string) => verifySession(t) }));
vi.mock("../src/store.js", () => ({
  findUserById: (uid: string) => findUserById(uid),
  // The real `toAuthedUser` maps a row to the public shape; identity is enough
  // to prove withSession assigns what the store handed back.
  toAuthedUser: (row: unknown) => row,
}));

const {
  HttpError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  handler,
  withSession,
  requireUser,
  requireVerifiedUser,
  errorMiddleware,
} = await import("../src/http.js");

/** Minimal `req` carrying only what these functions read. */
function mkReq(over: Partial<Request> = {}): Request {
  return { headers: {}, ...over } as Request;
}

/** Minimal `res` recording the status/body the error middleware writes. */
function mkRes(headersSent = false) {
  const res = {
    headersSent,
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res as typeof res & Response;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HttpError + the status constructors", () => {
  it("carries status and code, defaulting the message to the code", () => {
    const err = new HttpError(418, "teapot");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("HttpError");
    expect(err.status).toBe(418);
    expect(err.code).toBe("teapot");
    expect(err.message).toBe("teapot");
  });

  it("keeps an explicit message alongside the machine code", () => {
    const err = new HttpError(400, "invalid-argument", "seatCount must be positive");
    expect(err.code).toBe("invalid-argument");
    expect(err.message).toBe("seatCount must be positive");
  });

  it("maps each constructor to its status and default code", () => {
    expect([badRequest().status, badRequest().code]).toEqual([400, "invalid-argument"]);
    expect([unauthorized().status, unauthorized().code]).toEqual([401, "unauthenticated"]);
    expect([forbidden().status, forbidden().code]).toEqual([403, "permission-denied"]);
    expect([notFound().status, notFound().code]).toEqual([404, "not-found"]);
  });

  it("accepts an override code, which is how the auth routes keep the auth/* strings", () => {
    // src/calc/app/authError.ts maps these to i18n keys on the client.
    expect(badRequest("auth/email-already-in-use").code).toBe("auth/email-already-in-use");
    expect(unauthorized("auth/wrong-password").code).toBe("auth/wrong-password");
  });
});

describe("handler", () => {
  it("does not call next when the handler resolves", async () => {
    const next = vi.fn();
    const fn = vi.fn().mockResolvedValue({ ok: true });
    handler(fn)(mkReq(), mkRes(), next as unknown as NextFunction);
    await vi.waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    expect(next).not.toHaveBeenCalled();
  });

  it("routes a rejection to next, so the error middleware shapes it", async () => {
    const next = vi.fn();
    const boom = forbidden("email-not-verified");
    handler(() => Promise.reject(boom))(mkReq(), mkRes(), next as unknown as NextFunction);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(boom));
  });

  it("routes a throw inside an async body to next", async () => {
    // The shape every call site uses: all 32 are `handler(async …)`, so a throw
    // in the body surfaces as a rejected promise rather than escaping the
    // wrapper. (`handler` types `fn` as returning a Promise, so a genuinely
    // synchronous throw is not reachable.)
    const next = vi.fn();
    const boom = badRequest("auth/wrong-password");
    handler(async () => {
      throw boom;
    })(mkReq(), mkRes(), next as unknown as NextFunction);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(boom));
  });
});

describe("requireUser", () => {
  it("returns the resolved user", () => {
    const user = { id: "u1", emailVerified: true };
    expect(requireUser(mkReq({ user } as Partial<Request>))).toBe(user);
  });

  it("throws 401 unauthenticated for an anonymous request", () => {
    expect(() => requireUser(mkReq())).toThrow(HttpError);
    try {
      requireUser(mkReq());
    } catch (err) {
      expect((err as InstanceType<typeof HttpError>).status).toBe(401);
      expect((err as InstanceType<typeof HttpError>).code).toBe("unauthenticated");
    }
  });
});

describe("requireVerifiedUser", () => {
  it("returns a user whose email is verified", () => {
    const user = { id: "u1", emailVerified: true };
    expect(requireVerifiedUser(mkReq({ user } as Partial<Request>))).toBe(user);
  });

  it("throws 403 email-not-verified for an unverified account", () => {
    // Email verification is the ownership proof the grant routes rely on, so
    // this guard is what stops an unverified address claiming a domain match.
    try {
      requireVerifiedUser(mkReq({ user: { id: "u1", emailVerified: false } } as Partial<Request>));
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as InstanceType<typeof HttpError>).status).toBe(403);
      expect((err as InstanceType<typeof HttpError>).code).toBe("email-not-verified");
    }
  });

  it("still reports 401 (not 403) when nobody is signed in", () => {
    try {
      requireVerifiedUser(mkReq());
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as InstanceType<typeof HttpError>).status).toBe(401);
    }
  });
});

describe("withSession", () => {
  /** Run the middleware and resolve once it has called next. */
  function run(req: Request): Promise<{ req: Request; next: ReturnType<typeof vi.fn> }> {
    const next = vi.fn();
    withSession(req, mkRes(), next as unknown as NextFunction);
    return vi.waitFor(() => {
      expect(next).toHaveBeenCalled();
      return { req, next };
    });
  }

  it("resolves the session cookie into req.user", async () => {
    const row = { id: "u1", emailVerified: true };
    verifySession.mockResolvedValue("u1");
    findUserById.mockResolvedValue(row);

    const { req } = await run(mkReq({ headers: { cookie: "fg_session=tok-abc" } }));

    expect(verifySession).toHaveBeenCalledWith("tok-abc");
    expect(findUserById).toHaveBeenCalledWith("u1");
    expect(req.user).toBe(row);
  });

  it("accepts a bearer token, which is how the native shell authenticates", async () => {
    const row = { id: "u2", emailVerified: true };
    verifySession.mockResolvedValue("u2");
    findUserById.mockResolvedValue(row);

    const { req } = await run(mkReq({ headers: { authorization: "Bearer tok-native" } }));

    expect(verifySession).toHaveBeenCalledWith("tok-native");
    expect(req.user).toBe(row);
  });

  it("prefers the cookie when both are present", async () => {
    verifySession.mockResolvedValue("u1");
    findUserById.mockResolvedValue({ id: "u1" });

    await run(
      mkReq({ headers: { cookie: "fg_session=from-cookie", authorization: "Bearer from-header" } }),
    );

    expect(verifySession).toHaveBeenCalledWith("from-cookie");
  });

  it("ignores an Authorization header that is not a Bearer token", async () => {
    verifySession.mockResolvedValue(null);

    const { req } = await run(mkReq({ headers: { authorization: "Basic dXNlcjpwdw==" } }));

    expect(verifySession).toHaveBeenCalledWith(undefined);
    expect(req.user).toBeUndefined();
  });

  it("leaves the request anonymous — never rejecting — with no credential", async () => {
    verifySession.mockResolvedValue(null);

    const { req, next } = await run(mkReq());

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith(); // no error argument
    expect(findUserById).not.toHaveBeenCalled();
  });

  it("leaves the request anonymous when the token is invalid", async () => {
    verifySession.mockResolvedValue(null);

    const { req } = await run(mkReq({ headers: { cookie: "fg_session=garbage" } }));

    expect(req.user).toBeUndefined();
    expect(findUserById).not.toHaveBeenCalled();
  });

  it("leaves the request anonymous when the token names a deleted user", async () => {
    // A valid signature for a row that no longer exists must not authenticate.
    verifySession.mockResolvedValue("ghost");
    findUserById.mockResolvedValue(null);

    const { req, next } = await run(mkReq({ headers: { cookie: "fg_session=tok" } }));

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it("forwards a store failure to next rather than dropping the request", async () => {
    const boom = new Error("connection terminated");
    verifySession.mockResolvedValue("u1");
    findUserById.mockRejectedValue(boom);

    const { next } = await run(mkReq({ headers: { cookie: "fg_session=tok" } }));

    expect(next).toHaveBeenCalledWith(boom);
  });
});

describe("errorMiddleware", () => {
  it("shapes an HttpError into its status and { error, message } envelope", () => {
    const res = mkRes();
    const err = new HttpError(403, "permission-denied", "not your cohort");
    errorMiddleware(err, mkReq(), res, vi.fn());

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "permission-denied", message: "not your cohort" });
  });

  it("reports an unknown error as a bare 500, leaking no internals", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = mkRes();
    const err = new Error("SELECT * FROM users failed at db.internal:5432");
    errorMiddleware(err, mkReq(), res, vi.fn());

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "internal" });
    expect(JSON.stringify(res.body)).not.toContain("db.internal");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("handles a non-Error rejection as a 500 too", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = mkRes();
    errorMiddleware("just a string", mkReq(), res, vi.fn());

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "internal" });
    spy.mockRestore();
  });

  it("delegates to next once the response has started, rather than writing twice", () => {
    const next = vi.fn();
    const res = mkRes(true);
    const err = new HttpError(400, "invalid-argument");
    errorMiddleware(err, mkReq(), res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.statusCode).toBe(0);
    expect(res.body).toBeUndefined();
  });
});
