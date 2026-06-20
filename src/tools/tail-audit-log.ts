import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readAuditEntries } from "../security/audit.js";
import { sanitizeError, sanitizeOutput } from "../security/sanitize.js";
import { validateLimit } from "../security/validate.js";
import { textResult } from "./format.js";

export function registerTailAuditLog(server: McpServer): void {
  server.tool(
    "tail_audit_log",
    "Read the local MCP server JSONL audit trail.",
    { limit: z.number().int().optional() },
    async ({ limit }) => {
      try {
        const entries = await readAuditEntries(validateLimit(limit, 20, 1, 100));
        return textResult(sanitizeOutput(entries));
      } catch (error) {
        return textResult({ error: sanitizeError(error) });
      }
    }
  );
}
