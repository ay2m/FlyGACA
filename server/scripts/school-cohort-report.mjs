#!/usr/bin/env node
/**
 * Report a Fly GACA school cohort's SEAT status and study READINESS — the CLI twin
 * of the `/business/admin` dashboard, for operators who want a CSV. For every email
 * on the roster it reports the seat (in-force `school` seat / lapsed / pending
 * invite / none) and, from the seat's synced study progress, coverage (quiz banks ≥
 * threshold), best Mock Exam %, and whether they're READY to sit.
 *
 * Readiness = every expected quiz bank ≥ threshold AND Mock Exam ≥ threshold. The
 * expected banks default to the AIP pack (`aip-ais`, `airspace`); override with
 * `--banks=`. Threshold defaults to 75; override with `--threshold=`.
 *
 * The status/readiness rules come from the SAME pure cores the server uses
 * (src/school-core.ts), so this report and the dashboard agree by construction.
 *
 * Usage (from server/, with DATABASE_URL set; run `npm run build` first):
 *   node --env-file=../.env scripts/school-cohort-report.mjs --file=roster.csv
 *   node --env-file=../.env scripts/school-cohort-report.mjs --emails="a@x.com" --threshold=80
 *   node --env-file=../.env scripts/school-cohort-report.mjs --file=roster.csv --csv=out.csv
 */
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";
import { cohortRow } from "../lib/school-core.js";

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}
function parseSeatEmails(text) {
  const seen = new Set();
  for (const raw of text.split(/[\s,;]+/)) {
    const e = raw.trim().toLowerCase();
    if (!e || e === "email") continue;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) continue;
    seen.add(e);
  }
  return [...seen];
}

const file = arg("file");
const emails = arg("emails");
const csvOut = arg("csv");
const threshold = Number.parseInt(arg("threshold") ?? "75", 10);
const banks = (arg("banks") ?? "aip-ais,airspace").split(",").map((s) => s.trim()).filter(Boolean);

const roster = parseSeatEmails(file ? readFileSync(file, "utf8") : (emails ?? ""));
if (roster.length === 0) {
  console.error("No valid emails. Pass --file=roster.csv or --emails=\"a@x.com,b@y.com\".");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// One pass: each roster email left-joined to its account, entitlement, synced
// progress and any seat row. Every join is outer — a roster member may have no
// account at all, which is itself a reportable state.
const { rows } = await client.query(
  `SELECT r.email,
          e.plan, e.expires_at, e.source,
          sp.summary, sp.updated_at AS progress_updated_at,
          (s.email IS NOT NULL) AS has_invite
     FROM unnest($1::citext[]) AS r(email)
     LEFT JOIN users u            ON u.email = r.email
     LEFT JOIN entitlements e     ON e.user_id = u.id
     LEFT JOIN study_progress sp  ON sp.user_id = u.id
     LEFT JOIN org_seats s        ON s.email = r.email
    ORDER BY r.email`,
  [roster],
);
await client.end();

const report = rows.map((r) => {
  const entitlement = r.plan
    ? {
        plan: r.plan,
        ...(r.expires_at ? { expiresAt: r.expires_at.toISOString() } : {}),
        ...(r.source ? { source: r.source } : {}),
      }
    : null;
  const summary = r.summary
    ? { ...r.summary, updatedAt: r.progress_updated_at?.toISOString() }
    : null;
  return cohortRow({ email: r.email, entitlement, hasInvite: r.has_invite, summary }, banks, threshold);
});

const ready = report.filter((r) => r.ready).length;
const active = report.filter((r) => r.status === "active").length;

for (const row of report) {
  console.log(
    `${row.email.padEnd(34)} ${row.status.padEnd(8)} ` +
      `coverage ${row.coverage.padEnd(5)} exam ${String(row.examBest).padStart(3)}%  ` +
      `${row.hasProgress ? (row.ready ? "READY" : "not ready") : "—"}`,
  );
}
console.log(`\n${report.length} on roster · ${active} active seat(s) · ${ready} ready.`);

if (csvOut) {
  const header = "email,status,source,coverage,coveredBanks,totalBanks,examBest,ready,hasProgress,lastActive";
  const lines = report.map((r) =>
    [r.email, r.status, r.source, r.coverage, r.coveredBanks, r.totalBanks, r.examBest, r.ready, r.hasProgress, r.lastActive].join(","),
  );
  writeFileSync(csvOut, [header, ...lines].join("\n") + "\n");
  console.log(`Wrote ${csvOut}`);
}
process.exit(0);
