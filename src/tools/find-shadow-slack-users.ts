import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { findShadowSlackUsers } from "../services/access-review.js";
import { writeAuditEntry } from "../security/audit.js";
import { sanitizeError } from "../security/sanitize.js";
import { textResult } from "./format.js";

export function registerFindShadowSlackUsers(server: McpServer): void {
  server.tool(
    "find_shadow_slack_users",
    "Find active Slack users that do not cleanly match an active Okta user.",
    { limit: z.number().int().optional() },
    async ({ limit }) => {
      try {
        const output = await findShadowSlackUsers(limit);
        await writeAuditEntry({ tool: "find_shadow_slack_users", mode: "read", outcome: "success" });
        return textResult(output);
      } catch (error) {
        const message = sanitizeError(error);
        await writeAuditEntry({ tool: "find_shadow_slack_users", mode: "read", outcome: "error", message });
        return textResult({ error: message });
      }
    }
  );
}
