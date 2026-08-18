import { describe, expect, it } from "vitest";
import {
  API_KEY_PREFIX,
  newApiKey,
  hashApiKey,
  extractApiKey,
  keyPreview,
} from "../src/api-key-core.js";

describe("newApiKey", () => {
  it("is prefixed and unique", () => {
    const a = newApiKey();
    const b = newApiKey();
    expect(a.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(API_KEY_PREFIX.length + 20);
  });
});

describe("hashApiKey", () => {
  it("is a deterministic 64-char hex digest, differing per key", () => {
    const k = newApiKey();
    expect(hashApiKey(k)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashApiKey(k)).toBe(hashApiKey(k));
    expect(hashApiKey(k)).not.toBe(hashApiKey(newApiKey()));
    // Surrounding whitespace is trimmed so header parsing quirks don't fork the hash.
    expect(hashApiKey(`  ${k}  `)).toBe(hashApiKey(k));
  });
});

describe("extractApiKey", () => {
  it("prefers X-Api-Key, then Bearer", () => {
    expect(extractApiKey("Bearer abc", "xyz")).toBe("xyz");
    expect(extractApiKey("Bearer abc", undefined)).toBe("abc");
    expect(extractApiKey("bearer abc", null)).toBe("abc"); // case-insensitive scheme
  });

  it("returns null when neither header carries a key", () => {
    expect(extractApiKey(undefined, undefined)).toBeNull();
    expect(extractApiKey("Basic abc", "")).toBeNull();
    expect(extractApiKey(null, null)).toBeNull();
  });
});

describe("keyPreview", () => {
  it("exposes only the prefix plus a short fragment", () => {
    const k = newApiKey();
    const p = keyPreview(k);
    expect(k.startsWith(p)).toBe(true);
    expect(p.length).toBe(API_KEY_PREFIX.length + 6);
    expect(p.length).toBeLessThan(k.length);
  });
});
