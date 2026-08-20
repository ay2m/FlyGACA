/**
 * `server/src/routes/account.ts` and `server/src/routes/org.ts` — the last two
 * routes on the coverage exclude list.
 *
 * Both carry one load-bearing rule that lives only in the route body:
 *
 *  - account.ts derives the user id from the session on every handler, never
 *    from the path or body, so there is no way to address another account. It is
 *    also the guarantee that `entitlement`, chat credits and pack ownership are
 *    readable but have *no write route at all* — what firestore.rules used to
 *    say with an explicit deny.
 *  - org.ts re-verifies ownership from the database on every call
 *    (`owner_user_id = session uid`) rather than trusting the request, and
 *    answers 403 for "not yours" and "does not exist" alike.
 *
 * Real routers on a real Express app; only store.ts and db.ts are mocked, so the
 * org-core and school-core policy runs for real.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import type { AuthedUser } from "../src/store.js";

const loadAccount = vi.fn();
const saveProfile = vi.fn();
const upsertFlight = vi.fn();
const deleteFlight = vi.fn();
const upsertRecord = vi.fn();
const deleteRecord = vi.fn();
const saveStudyProgress = vi.fn();
const query = vi.fn();
const queryOne = vi.fn();

vi.mock("../src/store.js", () => ({
  loadAccount: (...a: unknown[]) => loadAccount(...a),
  saveProfile: (...a: unknown[]) => saveProfile(...a),
  upsertFlight: (...a: unknown[]) => upsertFlight(...a),
  deleteFlight: (...a: unknown[]) => deleteFlight(...a),
  upsertRecord: (...a: unknown[]) => upsertRecord(...a),
  deleteRecord: (...a: unknown[]) => deleteRecord(...a),
  saveStudyProgress: (...a: unknown[]) => saveStudyProgress(...a),
}));
vi.mock("../src/db.js", () => ({
  query: (...a: unknown[]) => query(...a),
  queryOne: (...a: unknown[]) => queryOne(...a),
}));

const { accountRouter } = await import("../src/routes/account.js");
const { orgRouter } = await import("../src/routes/org.js");
const { errorMiddleware } = await import("../src/http.js");

let currentUser: AuthedUser | null = null;

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  if (currentUser) req.user = currentUser;
  next();
});
app.use("/api/account", accountRouter);
app.use("/api/org", orgRouter);
app.use(errorMiddleware);

function user(over: Partial<AuthedUser> = {}): AuthedUser {
  return {
    uid: "owner-1",
    email: "owner@example.com",
    emailVerified: true,
    displayName: "Owner",
    createdAtMs: 0,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = null;
  loadAccount.mockResolvedValue({ profile: {}, flights: [], records: [] });
  query.mockResolvedValue([]);
  queryOne.mockResolvedValue(null);
});

describe("account routes require a session", () => {
  it.each([
    ["get", "/api/account"],
    ["put", "/api/account/profile"],
    ["post", "/api/account/logbook"],
    ["patch", "/api/account/logbook/f1"],
    ["delete", "/api/account/logbook/f1"],
    ["post", "/api/account/records"],
    ["patch", "/api/account/records/r1"],
    ["delete", "/api/account/records/r1"],
    ["put", "/api/account/study-progress"],
  ] as const)("%s %s answers 401 when anonymous", async (method, path) => {
    const res = await request(app)[method](path).send({});
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("unauthenticated");
  });
});

describe("account routes scope every write to the session's own uid", () => {
  beforeEach(() => {
    currentUser = user({ uid: "me" });
  });

  it("reads the caller's own account", async () => {
    const res = await request(app).get("/api/account");
    expect(res.status).toBe(200);
    expect(loadAccount).toHaveBeenCalledWith("me");
  });

  it("ignores a uid supplied in the body", async () => {
    // The whole point: identity comes from the session, never the payload.
    await request(app)
      .put("/api/account/profile")
      .send({ uid: "someone-else", userId: "someone-else", displayName: "Me" });

    const [uid, fields] = saveProfile.mock.calls[0] as [string, Record<string, string>];
    expect(uid).toBe("me");
    // Non-string values are dropped; the uid keys are just ordinary strings here
    // and are stored as profile fields, not used for addressing.
    expect(fields.displayName).toBe("Me");
  });

  it("keeps only string profile fields", async () => {
    await request(app)
      .put("/api/account/profile")
      .send({ displayName: "Me", licences: ["PPL"], hours: 120, nested: { a: 1 } });

    const [, fields] = saveProfile.mock.calls[0] as [string, Record<string, string>];
    expect(fields).toEqual({ displayName: "Me" });
  });

  it("writes a logbook entry under the caller's uid", async () => {
    const res = await request(app)
      .post("/api/account/logbook")
      .send({ id: "f1", date: "2026-08-01", route: "OERK-OEJN" });

    expect(res.status).toBe(201);
    const [uid, id] = upsertFlight.mock.calls[0] as [string, string];
    expect(uid).toBe("me");
    expect(id).toBe("f1");
  });

  it("takes the entry id from the path on a patch and delete", async () => {
    await request(app).patch("/api/account/logbook/f9").send({ route: "OEJN-OERK" });
    expect((upsertFlight.mock.calls[0] as [string, string])[1]).toBe("f9");

    await request(app).delete("/api/account/logbook/f9");
    expect(deleteFlight).toHaveBeenCalledWith("me", "f9");
  });

  it("handles records the same way", async () => {
    const created = await request(app).post("/api/account/records").send({ id: "r1", kind: "medical" });
    expect(created.status).toBe(201);
    expect((upsertRecord.mock.calls[0] as [string, string])[0]).toBe("me");

    await request(app).delete("/api/account/records/r1");
    expect(deleteRecord).toHaveBeenCalledWith("me", "r1");
  });

  it("saves study progress under the caller's uid", async () => {
    await request(app).put("/api/account/study-progress").send({ quiz: { score: 80 } });
    expect((saveStudyProgress.mock.calls[0] as [string])[0]).toBe("me");
  });

  it("rejects a missing or over-long entry id", async () => {
    const none = await request(app).post("/api/account/logbook").send({ date: "2026-08-01" });
    expect(none.status).toBe(400);
    expect(none.body.error).toBe("invalid-id");

    const long = await request(app)
      .post("/api/account/logbook")
      .send({ id: "x".repeat(65), date: "2026-08-01" });
    expect(long.status).toBe(400);
    expect(upsertFlight).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only entry id", async () => {
    const res = await request(app).post("/api/account/records").send({ id: "   " });
    expect(res.status).toBe(400);
    expect(upsertRecord).not.toHaveBeenCalled();
  });

  it("tolerates a request with no body at all", async () => {
    // `body()` guards against req.body being undefined — which is what a PUT
    // with no payload actually produces, not a JSON `null` literal (express.json
    // rejects that at the parser, before the route ever sees it).
    const res = await request(app).put("/api/account/profile");
    expect(res.status).toBe(200);
    expect(saveProfile).toHaveBeenCalledWith("me", {});
  });
});

describe("the account surface has no route that writes an entitlement", () => {
  it("exposes only profile, logbook, record and progress writes", async () => {
    // What firestore.rules used to forbid is now structural: there is simply no
    // route here that lets a client set its own plan, credits or pack ownership.
    const registered = (accountRouter as unknown as { stack: { route?: { path: string } }[] }).stack
      .map((l) => l.route?.path)
      .filter((p): p is string => Boolean(p));

    expect(new Set(registered)).toEqual(
      new Set([
        "/",
        "/profile",
        "/logbook",
        "/logbook/:id",
        "/records",
        "/records/:id",
        "/study-progress",
      ]),
    );
    for (const path of registered) {
      expect(path).not.toMatch(/entitlement|credit|pack|plan/i);
    }
  });
});

describe("GET /org/mine", () => {
  it("lists only the orgs the caller owns", async () => {
    currentUser = user();
    query.mockResolvedValue([{ id: "o1", name: "Riyadh Wings", seat_limit: 25, seats_used: 4 }]);

    const res = await request(app).get("/api/org/mine");

    expect(res.body.orgs).toEqual([
      { id: "o1", name: "Riyadh Wings", seatLimit: 25, seatsUsed: 4 },
    ]);
    // The ownership filter is in the query, parameterized by the session uid.
    const [sql, params] = query.mock.calls[0] as [string, string[]];
    expect(sql).toContain("owner_user_id = $1");
    expect(params).toEqual(["owner-1"]);
  });

  it("returns an empty list rather than erroring when the caller owns none", async () => {
    currentUser = user();
    query.mockResolvedValue([]);
    await expect(request(app).get("/api/org/mine")).resolves.toMatchObject({
      status: 200,
      body: { orgs: [] },
    });
  });

  it("requires a session", async () => {
    const res = await request(app).get("/api/org/mine");
    expect(res.status).toBe(401);
  });
});

describe("org ownership is re-checked from the database", () => {
  it("403s the readiness report for an org the caller does not own", async () => {
    currentUser = user({ uid: "not-the-owner" });
    queryOne.mockResolvedValue(null); // the owner-scoped SELECT found nothing

    const res = await request(app).get("/api/org/o1/cohort-readiness");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("permission-denied");
  });

  it("403s identically for an org that does not exist — the two are indistinguishable", async () => {
    currentUser = user();
    queryOne.mockResolvedValue(null);

    const res = await request(app).get("/api/org/does-not-exist/cohort-readiness");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("permission-denied");
  });

  it("scopes the ownership lookup by both org id and session uid", async () => {
    currentUser = user({ uid: "owner-9" });
    queryOne.mockResolvedValue(null);

    await request(app).get("/api/org/o1/cohort-readiness");

    const [sql, params] = queryOne.mock.calls[0] as [string, string[]];
    expect(sql).toContain("owner_user_id = $2");
    expect(params).toEqual(["o1", "owner-9"]);
  });

  it("returns the cohort report for an owned org", async () => {
    currentUser = user();
    queryOne.mockResolvedValue({ id: "o1", name: "Riyadh Wings", seat_limit: 25 });
    query.mockResolvedValue([
      {
        email: "cadet@example.com",
        plan: "school",
        expires_at: null,
        source: "school",
        summary: null,
        progress_updated_at: null,
      },
    ]);

    const res = await request(app).get("/api/org/o1/cohort-readiness");

    expect(res.status).toBe(200);
    expect(res.body.counts.total).toBe(1);
    expect(res.body.rows).toHaveLength(1);
  });

  it("requires a session before any lookup", async () => {
    const res = await request(app).get("/api/org/o1/cohort-readiness");
    expect(res.status).toBe(401);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("POST /org/:orgId/provision-seats", () => {
  beforeEach(() => {
    currentUser = user();
  });

  it("invites each address against the owned org", async () => {
    queryOne
      .mockResolvedValueOnce({ id: "o1", name: "Riyadh Wings", seat_limit: null })
      .mockResolvedValue(null);

    const res = await request(app)
      .post("/api/org/o1/provision-seats")
      .send({ emails: ["a@example.com", "b@example.com"] });

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([
      { email: "a@example.com", success: true },
      { email: "b@example.com", success: true },
    ]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO org_seats"),
      expect.arrayContaining(["o1", "a@example.com"]),
    );
  });

  it("403s for an org the caller does not own, provisioning nothing", async () => {
    queryOne.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/org/o1/provision-seats")
      .send({ emails: ["a@example.com"] });

    expect(res.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it("429s rather than overfilling a seat-limited org", async () => {
    queryOne
      .mockResolvedValueOnce({ id: "o1", name: "Riyadh Wings", seat_limit: 2 })
      .mockResolvedValueOnce({ count: 2 });

    const res = await request(app)
      .post("/api/org/o1/provision-seats")
      .send({ emails: ["a@example.com"] });

    expect(res.status).toBe(429);
    expect(res.body.error).toBe("resource-exhausted");
    expect(query).not.toHaveBeenCalled();
  });

  it("refuses to provision seats once the paid intake window has closed", async () => {
    // The Cohort sells ONE 90-day intake, but the seat cap counts rows and this
    // route re-dates every seat it touches — so without an expiry check an owner
    // could recycle the same 25 seats forever, turning one purchase into permanent
    // `school` accounts.
    queryOne.mockResolvedValueOnce({
      id: "o1",
      name: "Riyadh Wings",
      seat_limit: 25,
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    const res = await request(app)
      .post("/api/org/o1/provision-seats")
      .send({ emails: ["a@example.com"] });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("cohort-expired");
    expect(query).not.toHaveBeenCalled();
  });

  it("still provisions for an open-ended org, and for one inside its window", async () => {
    // NULL expiry is an operator-granted contract (scripts/grant-org.mjs) and must
    // not be swept up by the check above.
    queryOne
      .mockResolvedValueOnce({ id: "o1", name: "Riyadh Wings", seat_limit: null, expires_at: null })
      .mockResolvedValue(null);

    const open = await request(app)
      .post("/api/org/o1/provision-seats")
      .send({ emails: ["a@example.com"] });
    expect(open.status).toBe(200);

    queryOne
      .mockResolvedValueOnce({
        id: "o1",
        name: "Riyadh Wings",
        seat_limit: null,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .mockResolvedValue(null);

    const inWindow = await request(app)
      .post("/api/org/o1/provision-seats")
      .send({ emails: ["b@example.com"] });
    expect(inWindow.status).toBe(200);
  });

  it("reports a per-address failure without failing the whole batch", async () => {
    queryOne
      .mockResolvedValueOnce({ id: "o1", name: "Riyadh Wings", seat_limit: null })
      .mockResolvedValue(null);

    const res = await request(app)
      .post("/api/org/o1/provision-seats")
      .send({ emails: ["good@example.com", "not-an-email"] });

    expect(res.status).toBe(200);
    const byEmail = Object.fromEntries(
      (res.body.results as { email: string; success: boolean; error?: string }[]).map((r) => [
        r.email,
        r,
      ]),
    );
    expect(byEmail["good@example.com"].success).toBe(true);
    expect(byEmail["not-an-email"]).toMatchObject({ success: false, error: "invalid-email" });
  });

  it("survives a write failure on one address", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    queryOne
      .mockResolvedValueOnce({ id: "o1", name: "Riyadh Wings", seat_limit: null })
      .mockResolvedValue(null);
    query.mockRejectedValue(new Error("unique violation"));

    const res = await request(app)
      .post("/api/org/o1/provision-seats")
      .send({ emails: ["a@example.com"] });

    expect(res.status).toBe(200);
    expect(res.body.results[0]).toMatchObject({ success: false, error: "write-failed" });
    spy.mockRestore();
  });

  it("400s on a malformed request before checking ownership", async () => {
    const res = await request(app).post("/api/org/o1/provision-seats").send({ emails: [] });

    expect(res.status).toBe(400);
    expect(queryOne).not.toHaveBeenCalled();
  });

  it("requires a session", async () => {
    currentUser = null;
    const res = await request(app)
      .post("/api/org/o1/provision-seats")
      .send({ emails: ["a@example.com"] });
    expect(res.status).toBe(401);
  });
});
