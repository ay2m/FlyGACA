/**
 * HTTP plumbing shared by every route: the JSON error envelope, an async handler
 * wrapper, and the session-resolving middleware.
 *
 * Error codes on the auth routes deliberately reuse the Firebase `auth/*` strings
 * (`auth/wrong-password`, `auth/email-already-in-use`, …). The client's
 * `calc/app/authError.ts` maps those to i18n keys, so keeping them means the whole
 * error-copy layer survived the backend swap untouched.
 */
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { parse as parseCookie } from "cookie";
import { config } from "./config.js";
import { verifySession } from "./session.js";
import { findUserById, toAuthedUser, type AuthedUser } from "./store.js";

declare module "express-serve-static-core" {
  interface Request {
    /** Populated by {@link withSession}; absent for anonymous callers. */
    user?: AuthedUser;
  }
}

/** An error carrying the machine code and status to send to the client. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (code = "invalid-argument") => new HttpError(400, code);
export const unauthorized = (code = "unauthenticated") => new HttpError(401, code);
export const forbidden = (code = "permission-denied") => new HttpError(403, code);
export const notFound = (code = "not-found") => new HttpError(404, code);

/** Wrap an async handler so a rejected promise reaches the error middleware. */
export function handler(
  fn: (req: Request, res: Response) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

/**
 * Resolve the session cookie (or, for the native shell, a bearer token) into
 * `req.user`. Never rejects — an invalid or absent credential simply leaves the
 * request anonymous, and routes that require identity call {@link requireUser}.
 */
export const withSession: RequestHandler = (req, _res, next) => {
  void (async () => {
    const cookies = parseCookie(req.headers.cookie ?? "");
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7).trim()
      : undefined;
    const uid = await verifySession(cookies[config.session.cookieName] ?? bearer);
    if (uid) {
      const row = await findUserById(uid);
      if (row) req.user = toAuthedUser(row);
    }
    next();
  })().catch(next);
};

/** The signed-in user, or a 401. */
export function requireUser(req: Request): AuthedUser {
  if (!req.user) throw unauthorized();
  return req.user;
}

/** A signed-in user whose email is verified, or a 401/403. */
export function requireVerifiedUser(req: Request): AuthedUser {
  const user = requireUser(req);
  if (!user.emailVerified) throw forbidden("email-not-verified");
  return user;
}

/** Terminal error middleware — the only place a response body is shaped on failure. */
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "internal" });
}
