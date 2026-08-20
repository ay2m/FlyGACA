/**
 * `server/src/routes/grants.ts` — the complimentary-grant routes (staff, school
 * seat, founding window).
 *
 * These and the billing routes are the ONLY writers of `entitlements`, and the
 * whole entitlement model rests on rules that live in the route bodies rather
 * than in a `*-core` module: every grant is upgrade-only, and every domain or
 * roster match is honoured only for a VERIFIED email. `routes/**` was excluded
 * from the coverage `include`, so none of that was measured or asserted.
 *
 * The routers are mounted on a real Express app and driven over HTTP with
 * supertest, so `handler`, `requireUser` and `errorMiddleware` all run for real.
 * Only the two I/O edges are mocked — `store.ts` (entitlement reads/writes) and
 * `db.ts` (the seat lookups) — and the policy cores (staff/school/founding/
 * billing) are the genuine articles.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import type { Entitlement } from "../src/billing-core.js";
import type { AuthedUser } from "../src/store.js";

const getEntitlement = vi.fn<(uid: string) => Promise<Entitlement | null>>();
const setEntitlement = vi.fn<(uid: string, ent: Entitlement) => Promise<void>>();
const query = vi.fn();
const queryOne = vi.fn();

vi.mock("../src/store.js", () => ({
  getEntitlement: (uid: string) => getEntitlement(uid),
  setEntitlement: (uid: string, ent: Entitlement) => setEntitlement(uid, ent),
}));
vi.mock("../src/db.js", () => ({
  query: (...args: unknown[]) => query(...args),
  queryOne: (...args: unknown[]) => queryOne(...args),
}));

const { grantsRouter } = await import("../src/routes/grants.js");
const { errorMiddleware } = await import("../src/http.js");

/** Whoever `withSession` would have resolved; null for an anonymous caller. */
let currentUser: AuthedUser | null = null;

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  if (currentUser) req.user = currentUser;
  next();
});
app.use("/api/grants", grantsRouter);
app.use(errorMiddleware);

const BEFORE_CUTOFF = Date.parse("2020-01-01T00:00:00Z");
const AFTER_CUTOFF = Date.parse("2099-01-01T00:00:00Z");

function user(over: Partial<AuthedUser> = {}): AuthedUser {
  return {
    uid: "u1",
    email: "cadet@example.com",
    emailVerified: true,
    displayName: "Cadet",
    createdAtMs: AFTER_CUTOFF,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = null;
  getEntitlement.mockResolvedValue(null);
  setEntitlement.mockResolvedValue(undefined);
  queryOne.mockResolvedValue(null);
  query.mockResolvedValue(undefined);
});

describe("every grant route requires a session", () => {
  it.each(["/api/grants/staff", "/api/grants/school-seat", "/api/grants/founding"])(
    "%s answers 401 for an anonymous caller and writes nothing",
    async (path) => {
      const res = await request(app).post(path);
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: "unauthenticated" });
      expect(setEntitlement).not.toHaveBeenCalled();
    },
  );
});

describe("POST /staff", () => {
  it("grants the school tier to a verified staff domain address", async () => {
    currentUser = user({ email: "ops@flygaca.com" });

    const res = await request(app).post("/api/grants/staff");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ granted: true, plan: "school" });
    expect(setEntitlement).toHaveBeenCalledWith("u1", { plan: "school", source: "staff" });
  });

  it("refuses the same address when the email is unverified", async () => {
    // Verification is the ownership proof — otherwise anyone could register
    // an address on the staff domain and self-grant.
    currentUser = user({ email: "ops@flygaca.com", emailVerified: false });

    const res = await request(app).post("/api/grants/staff");

    expect(res.body).toEqual({ granted: false });
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("refuses an address that is not on the allowlist", async () => {
    currentUser = user({ email: "someone@notflygaca.com" });

    const res = await request(app).post("/api/grants/staff");

    expect(res.body).toEqual({ granted: false });
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("is idempotent — a second call does not rewrite a grant already in force", async () => {
    currentUser = user({ email: "ops@flygaca.com" });
    getEntitlement.mockResolvedValue({ plan: "school", source: "staff" });

    const res = await request(app).post("/api/grants/staff");

    expect(res.body).toEqual({ granted: true, plan: "school" });
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("re-writes when the row exists but is not the staff grant", async () => {
    currentUser = user({ email: "ops@flygaca.com" });
    getEntitlement.mockResolvedValue({ plan: "free", source: "staff" });

    await request(app).post("/api/grants/staff");

    expect(setEntitlement).toHaveBeenCalledWith("u1", { plan: "school", source: "staff" });
  });
});

describe("POST /school-seat", () => {
  it("refuses an unverified email before looking up any seat", async () => {
    currentUser = user({ emailVerified: false });

    const res = await request(app).post("/api/grants/school-seat");

    expect(res.body).toEqual({ granted: false });
    expect(queryOne).not.toHaveBeenCalled();
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("grants against an approved school domain", async () => {
    currentUser = user({ email: "student@academy.edu.sa" });
    // First lookup is the domain query.
    queryOne.mockResolvedValueOnce({ id: "school-1", expires_at: new Date("2027-01-01") });

    const res = await request(app).post("/api/grants/school-seat");

    expect(res.body).toEqual({ granted: true, plan: "school" });
    expect(setEntitlement).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ plan: "school", source: "school" }),
    );
  });

  it("claims a named roster invite, marking it claimed", async () => {
    currentUser = user({ email: "student@academy.edu.sa" });
    queryOne
      .mockResolvedValueOnce(null) // no domain match
      .mockResolvedValueOnce({ school_id: "school-1", expires_at: new Date("2027-01-01") });

    const res = await request(app).post("/api/grants/school-seat");

    expect(res.body).toEqual({ granted: true, plan: "school" });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE school_invites"), [
      "u1",
      "school-1",
      "student@academy.edu.sa",
    ]);
  });

  it("claims a B2B org seat, activating it", async () => {
    currentUser = user({ email: "pilot@airline.com" });
    queryOne
      .mockResolvedValueOnce(null) // no domain
      .mockResolvedValueOnce(null) // no invite
      .mockResolvedValueOnce({ org_id: "org-9", expires_at: null });

    const res = await request(app).post("/api/grants/school-seat");

    expect(res.body).toEqual({ granted: true, plan: "school" });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE org_seats"), [
      "u1",
      "org-9",
      "pilot@airline.com",
    ]);
  });

  it("refuses when no domain, invite or org seat matches", async () => {
    currentUser = user();

    const res = await request(app).post("/api/grants/school-seat");

    expect(res.body).toEqual({ granted: false });
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("merges upward — a short seat never shortens a longer paid plan", async () => {
    // The comment in the route calls this out explicitly: a bare write would
    // trade months of paid Pro for a 30-day seat and relabel the row.
    currentUser = user({ email: "student@academy.edu.sa" });
    queryOne.mockResolvedValueOnce({ id: "school-1", expires_at: new Date("2026-09-01") });
    getEntitlement.mockResolvedValue({
      plan: "pro",
      source: "moyasar",
      expiresAt: "2027-06-01T00:00:00.000Z",
    });

    await request(app).post("/api/grants/school-seat");

    const [, written] = setEntitlement.mock.calls[0];
    // Keeps the later paid expiry rather than the seat's earlier one.
    expect(Date.parse(written.expiresAt!)).toBeGreaterThanOrEqual(
      Date.parse("2027-06-01T00:00:00.000Z"),
    );
  });
});

describe("POST /founding", () => {
  it("grants Pro to an eligible free account and records the claim", async () => {
    currentUser = user({ createdAtMs: BEFORE_CUTOFF });
    queryOne.mockResolvedValueOnce({ user_id: "u1" }); // INSERT ... RETURNING won the race

    const res = await request(app).post("/api/grants/founding");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ granted: true, plan: "pro" });
    expect(queryOne).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO founding_grants"),
      ["u1"],
    );
    expect(setEntitlement).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ plan: "pro", source: "founding" }),
    );
  });

  it("refuses an unverified email", async () => {
    currentUser = user({ createdAtMs: BEFORE_CUTOFF, emailVerified: false });

    const res = await request(app).post("/api/grants/founding");

    expect(res.body).toEqual({ granted: false });
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("refuses an account created after the cutoff", async () => {
    // Eligibility is the server-held creation time, so a client cannot assert it.
    currentUser = user({ createdAtMs: AFTER_CUTOFF });

    const res = await request(app).post("/api/grants/founding");

    expect(res.body).toEqual({ granted: false });
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("never touches an account that already holds a paid plan", async () => {
    currentUser = user({ createdAtMs: BEFORE_CUTOFF });
    getEntitlement.mockResolvedValue({
      plan: "pro",
      source: "moyasar",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });

    const res = await request(app).post("/api/grants/founding");

    expect(res.body).toEqual({ granted: false, already: true });
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("grants once per account — a replay loses the primary-key race", async () => {
    currentUser = user({ createdAtMs: BEFORE_CUTOFF });
    queryOne.mockResolvedValueOnce(null); // ON CONFLICT DO NOTHING returned no row

    const res = await request(app).post("/api/grants/founding");

    expect(res.body).toEqual({ granted: false, already: true });
    expect(setEntitlement).not.toHaveBeenCalled();
  });
});

describe("failure handling", () => {
  it("turns a store failure into a 500 without leaking the message", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    currentUser = user({ email: "ops@flygaca.com" });
    getEntitlement.mockRejectedValue(new Error("connection to db.internal:5432 refused"));

    const res = await request(app).post("/api/grants/staff");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "internal" });
    expect(JSON.stringify(res.body)).not.toContain("db.internal");
    spy.mockRestore();
  });
});
