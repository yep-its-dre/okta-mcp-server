import { describe, expect, it } from "vitest";
import { validateEmail, validateEventType, validateLimit, validateLogQuery } from "../src/security/validate.js";

describe("validateEmail", () => {
  it("normalizes valid email addresses", () => {
    expect(validateEmail(" User@Example.COM ")).toBe("user@example.com");
  });

  it("rejects malformed email addresses", () => {
    expect(() => validateEmail("not-an-email")).toThrow("Invalid email");
  });
});

describe("validateLimit", () => {
  it("uses a default when no limit is supplied", () => {
    expect(validateLimit(undefined, 25, 1, 100)).toBe(25);
  });

  it("rejects out-of-range limits", () => {
    expect(() => validateLimit(101, 25, 1, 100)).toThrow("between 1 and 100");
  });
});

describe("validateEventType", () => {
  it("allows known Okta event types", () => {
    expect(validateEventType("user.session.start")).toBe("user.session.start");
  });

  it("rejects unsupported event types", () => {
    expect(() => validateEventType("anything.goes")).toThrow("Unsupported eventType");
  });
});

describe("validateLogQuery", () => {
  it("allows keyword searches", () => {
    expect(validateLogQuery("jane@example.com")).toBe("jane@example.com");
  });

  it("rejects filter-like syntax", () => {
    expect(() => validateLogQuery('eventType eq "x"')).toThrow("keyword search only");
  });
});
