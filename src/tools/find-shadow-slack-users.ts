import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getUser } from "../okta/client.js";
import { listSlackUsers } from "../slack/client.js";
import { writeAuditEntry } from "../security/audit.js";
import { sanitizeError, sanitizeOutput } from "../security/sanitize.js";
import { validateLimit } from "../security/validate.js";
import { textResult } from "./format.js";

export function registerFindShadowSlackUsers(server: McpServer): void {
  server.tool(
    "find_shadow_slack_users",
    "Find active Slack users that do not cleanly match an active Okta user.",
    { limit: z.number().int().optional() },
    async ({ limit }) => {
      try {
        const max = validateLimit(limit, 25, 1, 100);
        const slackUsers = (await listSlackUsers())
          .filter((user) => !user.deleted && !user.is_bot && user.profile?.email)
          .slice(0, max);
        const findings = [];

        for (const slackUser of slackUsers) {
          const email = slackUser.profile?.email;
          if (!email) continue;
          try {
            const oktaUser = await getUser(email.toLowerCase());
            if (oktaUser.status !== "ACTIVE") {
              findings.push({
                email,
                slackUserId: slackUser.id,
                slackStatus: "active",
                oktaStatus: oktaUser.status,
                finding: "Slack account active while Okta user is not ACTIVE"
              });
            }
          } catch {
            findings.push({
              email,
              slackUserId: slackUser.id,
              slackStatus: "active",
              oktaStatus: "not_found",
              finding: "Slack account has no matching Okta user"
            });
          }
        }

        await writeAuditEntry({ tool: "find_shadow_slack_users", mode: "read", outcome: "success" });
        return textResult(sanitizeOutput({ checked: slackUsers.length, findings }));
      } catch (error) {
        const message = sanitizeError(error);
        await writeAuditEntry({ tool: "find_shadow_slack_users", mode: "read", outcome: "error", message });
        return textResult({ error: message });
      }
    }
  );
}
