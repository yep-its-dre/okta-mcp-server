import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { explainSlackAccess } from "../services/access-review.js";
import { writeAuditEntry } from "../security/audit.js";
import { sanitizeError, sanitizeOutput } from "../security/sanitize.js";
import { textResult } from "./format.js";

export function registerExplainSlackAccess(server: McpServer): void {
  server.tool(
    "explain_slack_access",
    "Explain whether an Okta user appears to have Slack access and why, using Okta groups plus Slack user state. Use email when available; use query for names.",
    { email: z.string().email().optional(), query: z.string().optional() },
    async ({ email, query }) => {
      const target = email ?? query ?? "unknown";
      try {
        const output = await explainSlackAccess({ email, query });
        await writeAuditEntry({ tool: "explain_slack_access", mode: "read", target: output.email, outcome: "success" });
        return textResult(output);
      } catch (error) {
        const message = sanitizeError(error);
        await writeAuditEntry({ tool: "explain_slack_access", mode: "read", target, outcome: "error", message });
        return textResult({ error: message });
      }
    }
  );
}
