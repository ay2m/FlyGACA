import { describe, expect, it } from "vitest";
import { SYSTEM_GUARDRAILS, buildSystem } from "../src/captain-adel-prompt.js";

describe("buildSystem", () => {
  const prompt = buildSystem("[1] (GACAR Part 91 §91.155) the passage text");

  it("keeps every non-negotiable guardrail", () => {
    for (const rule of SYSTEM_GUARDRAILS) {
      expect(prompt).toContain(rule);
    }
  });

  it("retains the core safety phrasing", () => {
    expect(prompt).toContain("ONLY using the CONTEXT");
    expect(prompt).toContain("never invent rule numbers, limits, or figures");
    expect(prompt).toContain("NOT affiliated with GACA");
    expect(prompt).toMatch(/Mirror the user's language/);
  });

  it("includes the answer-shaping directives", () => {
    expect(prompt).toContain("direct answer");
    expect(prompt).toContain("worked example");
    expect(prompt).toContain("> In practice:");
    expect(prompt).toMatch(/Cite the relevant Part and section/);
  });

  it("embeds the retrieved context block", () => {
    expect(prompt).toContain("CONTEXT:");
    expect(prompt).toContain("the passage text");
  });
});
