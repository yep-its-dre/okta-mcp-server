import { describe, expect, it } from "vitest";
import { sanitizeError, sanitizeOutput } from "../src/security/sanitize.js";

describe("sanitizeOutput", () => {
  it("redacts sensitive keys recursively", () => {
    const output = sanitizeOutput({
      status: "ACTIVE",
      accessToken: "secret-token",
      nested: {
        clientSecret: "secret"
      }
    });

    expect(output).toEqual({
      status: "ACTIVE",
      accessToken: "[REDACTED]",
      nested: {
        clientSecret: "[REDACTED]"
      }
    });
  });
});

describe("sanitizeError", () => {
  it("redacts bearer tokens in error messages", () => {
    expect(sanitizeError("Authorization: Bearer abc123.def456")).toContain("Bearer [REDACTED]");
  });
});
