/**
 * The seam between this service's own Captain Adel implementation and the
 * standalone one in `ay2m/Captain-Adel`.
 *
 * `gateway.ts` used to import `captainAdelFlow` directly. It now goes through
 * this module, which exposes the identical shape — callable for the buffered
 * path, `.stream()` for SSE — and picks an implementation:
 *
 *   ADEL_REMOTE_BASE_URL unset (every revision today)
 *       → the local flow, unchanged. Byte-identical behaviour.
 *   ADEL_REMOTE_BASE_URL set
 *       → the standalone service over `remote-brain.ts`.
 *
 * The point is not to switch anything on. It is that the two implementations of
 * the family chat contract now meet at ONE named place instead of being wired
 * apart by prose in three repos' docs. Consolidating onto a single brain becomes
 * a reviewed config change rather than a rewrite of the gateway; the trade-offs
 * that decision still has to answer — chiefly that the two ground answers by
 * different mechanisms — are written up in `docs/DESIGN-brain-consolidation.md`.
 */
import { captainAdelFlow, type CaptainAdelOutput } from "./captain-adel.js";
import { askRemote, remoteBrainConfig } from "./remote-brain.js";
import type { ChatTurn } from "./contract.js";

export interface BrainInput {
  message: string;
  history?: ChatTurn[];
  product?: string;
  provider?: string;
  session?: string;
}

/** True when a remote brain is configured. False on every revision today. */
export function usingRemoteBrain(): boolean {
  return remoteBrainConfig() !== null;
}

/**
 * The buffered call. Same signature as `captainAdelFlow(req)`.
 *
 * The remote path has no token stream of its own here — `askRemote` buffers —
 * so `stream()` below emits the finished answer as a single chunk. That is a
 * deliberate first step: SSE pass-through is specced but not built, because
 * nothing consumes the remote path yet and an untested streaming translation
 * would be the riskiest possible thing to leave lying dormant.
 */
async function ask(req: BrainInput): Promise<CaptainAdelOutput> {
  const remote = remoteBrainConfig();
  if (!remote) return captainAdelFlow(req);
  return askRemote({ message: req.message, history: req.history, session: req.session }, remote);
}

/** The streaming call. Same shape as `captainAdelFlow.stream(req)`. */
function stream(req: BrainInput): {
  stream: AsyncIterable<string>;
  output: Promise<CaptainAdelOutput>;
} {
  const remote = remoteBrainConfig();
  if (!remote) return captainAdelFlow.stream(req);

  const output = askRemote(
    { message: req.message, history: req.history, session: req.session },
    remote,
  );
  return {
    stream: (async function* () {
      yield (await output).answer;
    })(),
    output,
  };
}

/**
 * The brain, as `gateway.ts` uses it: `brain(req)` for the buffered path,
 * `brain.stream(req)` for SSE.
 */
export const brain = Object.assign(ask, { stream });
