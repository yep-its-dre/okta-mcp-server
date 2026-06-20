import { mkdir, readFile, appendFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { config } from "../config.js";

export type AuditEntry = {
  requestId?: string;
  timestamp?: string;
  tool: string;
  mode: "read" | "blocked" | "dry_run" | "live";
  target?: string;
  outcome: "success" | "error";
  message?: string;
};

export async function writeAuditEntry(entry: AuditEntry): Promise<AuditEntry> {
  const complete = {
    requestId: entry.requestId ?? randomBytes(4).toString("hex"),
    timestamp: entry.timestamp ?? new Date().toISOString(),
    ...entry
  };
  await mkdir(dirname(config.auditLogPath), { recursive: true });
  await appendFile(config.auditLogPath, `${JSON.stringify(complete)}\n`, "utf8");
  return complete;
}

export async function readAuditEntries(limit: number): Promise<AuditEntry[]> {
  try {
    const raw = await readFile(config.auditLogPath, "utf8");
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .map((line: string) => JSON.parse(line) as AuditEntry);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
