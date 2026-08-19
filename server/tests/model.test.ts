import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The streaming client against a stubbed endpoint. `model-core.test.ts` covers
 * the wire format; this covers the parts only the real loop exercises — chunk
 * reassembly across reads, early termination, and what happens when the
 * provider says no.
 */

const ENV = { ...process.env };

/** A Response whose body streams the given chunks as bytes. */
function sseResponse(chunks: string[], init: { status?: number } = {}): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return new Response(body, { status: init.status ?? 200 });
}

const frame = (text: string) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n`;

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const d of gen) out.push(d);
  return out;
}

/** Import fresh so config.ts re-reads the env this test set. */
async function load() {
  vi.resetModules();
  return import("../src/model.js");
}

beforeEach(() => {
  process.env.MODEL_BASE_URL = "https://allam.example/v1";
  process.env.MODEL_API_KEY = "test-key";
});

afterEach(() => {
  process.env = { ...ENV };
  vi.unstubAllGlobals();
});

describe("streamChat", () => {
  it("yields each token delta in order and stops at [DONE]", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([frame("Under "), frame("GACAR "), frame("61.107"), "data: [DONE]\n"]),
      ),
    );
    const { streamChat } = await load();
    const out = await collect(streamChat({ model: "allam-7b-instruct", system: "S", message: "q" }));
    expect(out).toEqual(["Under ", "GACAR ", "61.107"]);
  });

  it("reassembles a frame split across two reads", async () => {
    // The bug this guards drops a token only when a frame straddles a chunk
    // boundary — invisible in dev, intermittent in production.
    const whole = frame("indivisible");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => sseResponse([whole.slice(0, 20), whole.slice(20), "data: [DONE]\n"])),
    );
    const { streamChat } = await load();
    const out = await collect(streamChat({ model: "m", system: "S", message: "q" }));
    expect(out).toEqual(["indivisible"]);
  });

  it("emits a trailing frame when the stream ends without [DONE]", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([frame("first"), frame("last").trim()])));
    const { streamChat } = await load();
    const out = await collect(streamChat({ model: "m", system: "S", message: "q" }));
    expect(out).toEqual(["first", "last"]);
  });

  it("sends the bearer token and the chat-completions path", async () => {
    const fetchMock = vi.fn(async () => sseResponse(["data: [DONE]\n"]));
    vi.stubGlobal("fetch", fetchMock);
    const { streamChat } = await load();
    await collect(streamChat({ model: "allam-34b-instruct", system: "S", message: "q" }));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://allam.example/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: "allam-34b-instruct",
      stream: true,
    });
  });

  it("does not send an Authorization header when no key is configured", async () => {
    // A self-hosted ALLaM on the private network needs no key; sending an empty
    // bearer would be rejected by some gateways.
    delete process.env.MODEL_API_KEY;
    const fetchMock = vi.fn(async () => sseResponse(["data: [DONE]\n"]));
    vi.stubGlobal("fetch", fetchMock);
    const { streamChat } = await load();
    await collect(streamChat({ model: "m", system: "S", message: "q" }));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("refuses to call anything when no endpoint is configured", async () => {
    // Better a loud failure than a regulatory question sent somewhere unintended.
    delete process.env.MODEL_BASE_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { streamChat, ModelError } = await load();
    await expect(collect(streamChat({ model: "m", system: "S", message: "q" }))).rejects.toThrow(
      ModelError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces the provider's error message on a non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([JSON.stringify({ error: { message: "model not found" } })], { status: 404 }),
      ),
    );
    const { streamChat } = await load();
    await expect(collect(streamChat({ model: "nope", system: "S", message: "q" }))).rejects.toThrow(
      /404.*model not found/,
    );
  });

  it("wraps a transport failure rather than leaking the raw fetch error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    const { streamChat, ModelError } = await load();
    await expect(collect(streamChat({ model: "m", system: "S", message: "q" }))).rejects.toThrow(
      ModelError,
    );
  });

  it("tolerates a trailing slash on the base URL", async () => {
    process.env.MODEL_BASE_URL = "https://allam.example/v1/";
    const fetchMock = vi.fn(async () => sseResponse(["data: [DONE]\n"]));
    vi.stubGlobal("fetch", fetchMock);
    const { streamChat } = await load();
    await collect(streamChat({ model: "m", system: "S", message: "q" }));
    expect(fetchMock.mock.calls[0][0]).toBe("https://allam.example/v1/chat/completions");
  });
});
