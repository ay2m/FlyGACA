import { describe, expect, it } from "vitest";
import { isStudentEmail } from "../src/student-core.js";

describe("isStudentEmail", () => {
  it("accepts verified academic domains (.edu / .ac and country variants)", () => {
    expect(isStudentEmail("sara@mit.edu", true)).toBe(true);
    expect(isStudentEmail("student@ksu.edu.sa", true)).toBe(true);
    expect(isStudentEmail("s@kfupm.edu.sa", true)).toBe(true);
    expect(isStudentEmail("x@some.ac.uk", true)).toBe(true);
    expect(isStudentEmail("A@School.EDU", true)).toBe(true); // case-insensitive
  });

  it("refuses an unverified academic email", () => {
    expect(isStudentEmail("student@ksu.edu.sa", false)).toBe(false);
    expect(isStudentEmail("sara@mit.edu", undefined)).toBe(false);
  });

  it("refuses non-academic domains", () => {
    expect(isStudentEmail("me@gmail.com", true)).toBe(false);
    expect(isStudentEmail("me@company.com", true)).toBe(false);
    expect(isStudentEmail("me@notedu.com", true)).toBe(false);
    expect(isStudentEmail("me@edu.example.com", true)).toBe(false); // .edu not at the tail
  });

  it("handles malformed / empty input", () => {
    expect(isStudentEmail("", true)).toBe(false);
    expect(isStudentEmail(null, true)).toBe(false);
    expect(isStudentEmail("no-at-symbol", true)).toBe(false);
    expect(isStudentEmail("@mit.edu", true)).toBe(false);
  });
});
