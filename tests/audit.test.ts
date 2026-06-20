import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "okta-mcp-audit-"));
  process.env.OKTA_DOMAIN = "dev-12345678.okta.com";
  process.env.OKTA_CLIENT_ID = "client";
  process.env.OKTA_CLIENT_SECRET = "secret";
  process.env.AUDIT_LOG_PATH = join(dir, "audit.log");
  vi.resetModules();
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("audit log", () => {
  it("writes and reads entries", async () => {
    const { writeAuditEntry, readAuditEntries } = await import("../src/security/audit.js");
    await writeAuditEntry({ tool: "get_user", mode: "read", target: "demo@example.com", outcome: "success" });
    const entries = await readAuditEntries(10);

    expect(entries).toHaveLength(1);
    expect(entries[0].tool).toBe("get_user");
    expect(entries[0].requestId).toMatch(/^[a-f0-9]{8}$/);
  });
});
