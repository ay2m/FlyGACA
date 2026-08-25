/**
 * The I/O half of the remote-brain client — the thin `fetch` wrapper around
 * Captain Adel's standalone `/v1/chat`, in the same core/wrapper split as
 * `model-core.ts` / `model.ts`.
 *
 * DORMANT BY DESIGN. Nothing reaches this module unless `ADEL_REMOTE_BASE_URL`
 * is set, and it is set on no revision. See `remote-brain-core.ts` for why the
 * seam exists and `docs/DESIGN-brain-consolidation.md` for what switching it on
 * would actually take.
 */
import {
  RemoteBrainError,
  TRUSTED_TIER_HEADER,
  buildRemoteRequest,
  toCaptainAdelOutput,
  type RemoteChatResponse,
} from "./remote-brain-core.js";
import type { CaptainAdelOutput } from "./captain-adel.js";
import type { ChatTurn } from "./contract.js";

export interface RemoteBrainConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
}

/**
 * Read the remote-brain config from the environment, or `null` when it is not
 * configured — which is the state on every revision today. `brain.ts` treats
 * `null` as "use the local flow", so an unset variable is not an error.
 */
export function remoteBrainConfig(): RemoteBrainConfig | null {
  const baseUrl = (process.env.ADEL_REMOTE_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (!baseUrl) return null;
  const timeout = Number(process.env.ADEL_REMOTE_TIMEOUT_MS);
  return {
    baseUrl,
    apiKey: (process.env.ADEL_API_KEY ?? "").trim(),
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 60_000,
  };
}

export interface RemoteBrainInput {
  message: string;
  history?: ChatTurn[];
  session?: string;
}

/**
 * Ask the standalone Captain Adel service one question, buffered.
 *
 * The trusted-tier header is what keeps this service out of Captain Adel's
 * per-user metering: quota and rate limits are already enforced by our own
 * `gateway.ts` before the call is made, and double-metering would deny paying
 * users at the second gate.
 */
export async function askRemote(
  input: RemoteBrainInput,
  cfg: RemoteBrainConfig,
): Promise<CaptainAdelOutput> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const res = await fetch(`${cfg.baseUrl}/v1/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cfg.apiKey ? { [TRUSTED_TIER_HEADER]: cfg.apiKey } : {}),
      },
      body: JSON.stringify(buildRemoteRequest(input)),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new RemoteBrainError(`remote brain answered ${res.status}`);
    }
    return toCaptainAdelOutput((await res.json()) as RemoteChatResponse);
  } finally {
    clearTimeout(timer);
  }
}
