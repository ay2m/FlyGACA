/**
 * Account sync against the first-party API. The pure mappers (wire doc ⇄ Profile /
 * Flight / PilotRecord / Entitlement) are unit-tested; the I/O helpers are
 * best-effort and gated on `isBackendConfigured()` so they no-op in the
 * local-first build.
 *
 * The server owns the `entitlement` field and rejects any client write to it, so
 * `profileToDoc` deliberately omits it — the same contract the Firestore rules
 * used to enforce.
 */
import type { Profile, Flight, PilotRecord } from '@/lib/services/account';
import type { Entitlement, Plan } from '@/lib/services/entitlements';
import { isBackendConfigured, apiFetch } from '@/lib/services/backend';

const PROFILE_FIELDS: (keyof Profile)[] = [
  'email',
  'displayName',
  'homeBase',
  'licenceType',
  'medicalExpiry',
  'lastFlightReview',
  'role',
];

const FLIGHT_FIELDS: (keyof Omit<Flight, 'id'>)[] = [
  'date',
  'type',
  'reg',
  'from',
  'to',
  'total',
  'pic',
  'night',
  'ifr',
  'ldg',
  'nightLdg',
  'appr',
  'remarks',
];

type Doc = Record<string, unknown> | undefined;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Pick the known profile string fields out of a user doc. */
export function profileFromDoc(d: Doc): Partial<Profile> {
  const out: Partial<Profile> = {};
  if (!d) return out;
  for (const f of PROFILE_FIELDS) if (d[f] !== undefined) out[f] = str(d[f]);
  return out;
}

/** Serialize the profile for the wire — never includes the server-only entitlement. */
export function profileToDoc(p: Profile): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of PROFILE_FIELDS) out[f] = str(p[f]);
  return out;
}

export function flightToDoc(f: Flight): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of FLIGHT_FIELDS) out[k] = str(f[k]);
  return out;
}

export function flightFromDoc(id: string, d: Record<string, unknown>): Flight {
  const out = { id } as Flight;
  for (const k of FLIGHT_FIELDS) out[k] = str(d[k]);
  return out;
}

const RECORD_FIELDS: (keyof Omit<PilotRecord, 'id'>)[] = [
  'category',
  'title',
  'ref',
  'issued',
  'expires',
  'remarks',
];

export function recordToDoc(r: PilotRecord): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of RECORD_FIELDS) out[k] = str(r[k]);
  return out;
}

export function recordFromDoc(id: string, d: Record<string, unknown>): PilotRecord {
  const out = { id } as PilotRecord;
  for (const k of RECORD_FIELDS) out[k] = str(d[k]) as never;
  return out;
}

const PLANS: Plan[] = ['free', 'pro', 'school'];

/** Read the server-written entitlement from a user doc (read-only here). */
export function entitlementFromDoc(d: Doc): Entitlement | null {
  const e = d?.entitlement;
  if (!e || typeof e !== 'object') return null;
  const rec = e as Record<string, unknown>;
  const plan = rec.plan;
  if (typeof plan !== 'string' || !PLANS.includes(plan as Plan)) return null;
  return {
    plan: plan as Plan,
    expiresAt: typeof rec.expiresAt === 'string' ? rec.expiresAt : undefined,
    source: rec.source as Entitlement['source'],
  };
}

export interface LoadedAccount {
  profile: Partial<Profile>;
  flights: Flight[];
  records?: PilotRecord[];
  entitlement: Entitlement | null;
  /** Purchased Captain Adel credits (server-written, owner-readable); 0 when none. */
  chatCredits: number;
  /** Purchased exam-prep pack ids (server-written, owner-readable); [] when none. */
  ownedPacks: string[];
}

/** Shape of `GET /api/account` — one round trip for everything the store hydrates. */
interface AccountResponse {
  user?: Record<string, unknown>;
  logbook?: Array<{ id: string } & Record<string, unknown>>;
  records?: Array<{ id: string } & Record<string, unknown>>;
  chatCredits?: number;
  ownedPacks?: string[];
}

/**
 * One-time hydration of the signed-in user's profile, logbook, records,
 * entitlement, credits & packs. The server derives the account from the session
 * cookie, so there is no uid to pass.
 */
export async function loadAccount(): Promise<LoadedAccount | null> {
  if (!isBackendConfigured()) return null;
  const data = await apiFetch<AccountResponse>('/account').catch(() => null);
  if (!data) return null;

  const balance = Number(data.chatCredits ?? 0);
  return {
    profile: profileFromDoc(data.user),
    flights: (data.logbook ?? []).map((d) => flightFromDoc(d.id, d)),
    records: (data.records ?? []).map((d) => recordFromDoc(d.id, d)),
    entitlement: entitlementFromDoc(data.user),
    chatCredits: Number.isFinite(balance) && balance > 0 ? Math.floor(balance) : 0,
    ownedPacks: Array.isArray(data.ownedPacks) ? data.ownedPacks : [],
  };
}

/** Fire-and-forget write helper — the local store already holds the truth. */
async function write(path: string, method: 'PUT' | 'POST' | 'PATCH' | 'DELETE', body?: unknown) {
  if (!isBackendConfigured()) return;
  try {
    await apiFetch<unknown>(path, { method, body });
  } catch {
    /* offline / not signed in — best-effort, the local store stays authoritative */
  }
}

export async function saveProfileDoc(profile: Profile): Promise<void> {
  await write('/account/profile', 'PUT', profileToDoc(profile));
}

export async function addFlightDoc(flight: Flight): Promise<void> {
  await write('/account/logbook', 'POST', { id: flight.id, ...flightToDoc(flight) });
}

export async function updateFlightDoc(id: string, flight: Flight): Promise<void> {
  await write(`/account/logbook/${encodeURIComponent(id)}`, 'PATCH', flightToDoc(flight));
}

export async function deleteFlightDoc(id: string): Promise<void> {
  await write(`/account/logbook/${encodeURIComponent(id)}`, 'DELETE');
}

export async function addRecordDoc(record: PilotRecord): Promise<void> {
  await write('/account/records', 'POST', { id: record.id, ...recordToDoc(record) });
}

export async function updateRecordDoc(id: string, record: PilotRecord): Promise<void> {
  await write(`/account/records/${encodeURIComponent(id)}`, 'PATCH', recordToDoc(record));
}

export async function deleteRecordDoc(id: string): Promise<void> {
  await write(`/account/records/${encodeURIComponent(id)}`, 'DELETE');
}
