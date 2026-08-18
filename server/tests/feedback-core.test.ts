import { describe, expect, it } from "vitest";
import { parseFeedback } from "../src/feedback-core.js";

describe("parseFeedback", () => {
  it("accepts a valid up/down rating with optional fields", () => {
    expect(parseFeedback({ rating: "up", session: "s1", question: "q", answer: "a" })).toEqual({
      rating: "up",
      session: "s1",
      question: "q",
      answer: "a",
    });
    expect(parseFeedback({ rating: "down" })).toEqual({ rating: "down" });
  });

  it("rejects a missing or unknown rating", () => {
    expect(parseFeedback({})).toBeNull();
    expect(parseFeedback({ rating: "meh" })).toBeNull();
    expect(parseFeedback(null)).toBeNull();
    expect(parseFeedback("up")).toBeNull();
  });

  it("drops blank free-text fields and trims/caps long ones", () => {
    expect(parseFeedback({ rating: "up", session: "  ", question: "" })).toEqual({ rating: "up" });
    const long = "x".repeat(5000);
    const out = parseFeedback({ rating: "down", answer: long });
    expect(out?.answer?.length).toBe(2000);
  });
});
