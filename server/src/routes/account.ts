/**
 * Account sync routes — the owner-scoped profile, logbook, records and study
 * progress. Replaces the `users/{uid}` Firestore subtree.
 *
 * Every handler derives the user id from the session, never from the path or
 * body, so there is no way to address another account. `entitlement`, chat
 * credits and pack ownership are readable here but have no write route at all —
 * the guarantee `firestore.rules` used to make with an explicit deny.
 */
import { Router } from "express";
import {
  loadAccount,
  saveProfile,
  upsertFlight,
  deleteFlight,
  upsertRecord,
  deleteRecord,
  saveStudyProgress,
} from "../store.js";
import { handler, requireUser, badRequest } from "../http.js";

export const accountRouter: Router = Router();

/** Reject an id that isn't a plain client-generated key. */
function entryId(raw: unknown): string {
  const id = typeof raw === "string" ? raw.trim() : "";
  if (!id || id.length > 64) throw badRequest("invalid-id");
  return id;
}

function body(req: { body?: unknown }): Record<string, unknown> {
  return req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
}

accountRouter.get(
  "/",
  handler(async (req, res) => {
    const user = requireUser(req);
    return res.json(await loadAccount(user.uid));
  }),
);

accountRouter.put(
  "/profile",
  handler(async (req, res) => {
    const user = requireUser(req);
    const raw = body(req);
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) if (typeof v === "string") fields[k] = v;
    await saveProfile(user.uid, fields);
    return res.json({ ok: true });
  }),
);

accountRouter.post(
  "/logbook",
  handler(async (req, res) => {
    const user = requireUser(req);
    const raw = body(req);
    await upsertFlight(user.uid, entryId(raw.id), raw);
    return res.status(201).json({ ok: true });
  }),
);

accountRouter.patch(
  "/logbook/:id",
  handler(async (req, res) => {
    const user = requireUser(req);
    await upsertFlight(user.uid, entryId(req.params.id), body(req));
    return res.json({ ok: true });
  }),
);

accountRouter.delete(
  "/logbook/:id",
  handler(async (req, res) => {
    const user = requireUser(req);
    await deleteFlight(user.uid, entryId(req.params.id));
    return res.json({ ok: true });
  }),
);

accountRouter.post(
  "/records",
  handler(async (req, res) => {
    const user = requireUser(req);
    const raw = body(req);
    await upsertRecord(user.uid, entryId(raw.id), raw);
    return res.status(201).json({ ok: true });
  }),
);

accountRouter.patch(
  "/records/:id",
  handler(async (req, res) => {
    const user = requireUser(req);
    await upsertRecord(user.uid, entryId(req.params.id), body(req));
    return res.json({ ok: true });
  }),
);

accountRouter.delete(
  "/records/:id",
  handler(async (req, res) => {
    const user = requireUser(req);
    await deleteRecord(user.uid, entryId(req.params.id));
    return res.json({ ok: true });
  }),
);

/** Scores + completion only — the client's `toProgressSummary` never sends answers. */
accountRouter.put(
  "/study-progress",
  handler(async (req, res) => {
    const user = requireUser(req);
    await saveStudyProgress(user.uid, body(req));
    return res.json({ ok: true });
  }),
);
