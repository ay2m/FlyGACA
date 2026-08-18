import { describe, expect, it } from "vitest";
import { frame, doneFrame, pingFrame, SSE_HEADERS } from "../src/sse.js";

// The wire format here is parsed verbatim by the frontend's drainSse()
// (src/lib/api.ts), so these assertions pin the exact bytes the client expects.
describe("frame", () => {
  it("serializes an event as one JSON data: line with a blank terminator", () => {
    expect(frame({ type: "token", delta: "hi" })).toBe(
      "data: {\"type\":\"token\",\"delta\":\"hi\"}\n\n",
    );
  });

  it("round-trips through JSON.parse after stripping the data: prefix", () => {
    const event = { type: "error", code: "stream_failed" } as const;
    const line = frame(event);
    const json = line.replace(/^data: /, "").trimEnd();
    expect(JSON.parse(json)).toEqual(event);
  });
});

describe("doneFrame / pingFrame", () => {
  it("emits the [DONE] sentinel", () => {
    expect(doneFrame()).toBe("data: [DONE]\n\n");
  });

  it("emits a comment keep-alive the client parser ignores", () => {
    const ping = pingFrame();
    expect(ping).toBe(": ping\n\n");
    expect(ping.startsWith(":")).toBe(true); // SSE comment, not a data line
  });
});

describe("SSE_HEADERS", () => {
  it("declares an event-stream that defeats proxy buffering", () => {
    expect(SSE_HEADERS["Content-Type"]).toBe("text/event-stream; charset=utf-8");
    expect(SSE_HEADERS["Cache-Control"]).toContain("no-cache");
    expect(SSE_HEADERS["X-Accel-Buffering"]).toBe("no");
  });
});
