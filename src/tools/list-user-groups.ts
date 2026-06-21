import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getUserGroups } from "../okta/client.js";
import { writeAuditEntry } from "../security/audit.js";
import { sanitizeError, sanitizeOutput } from "../security/sanitize.js";
import { textResult } from "./format.js";
import { resolveUser } from "./resolve-user.js";

export function registerListUserGroups(server: McpServer): void {
  server.tool(
    "list_user_groups",
    "List Okta groups for a user by email/login or name query and show group names, descriptions, and group types. Use email when available; use query for names.",
    { email: z.string().email().optional(), query: z.string().optional() },
    async ({ email, query }) => {
      const target = email ?? query ?? "unknown";
      try {
        const { user, target: resolvedTarget } = await resolveUser({ email, query });
        const groups = await getUserGroups(user.id);
        const output = sanitizeOutput(
          groups.map((group) => ({
            id: group.id,
            name: group.profile.name,
            description: group.profile.description,
            type: group.type
          }))
        );
        await writeAuditEntry({ tool: "list_user_groups", mode: "read", target: resolvedTarget, outcome: "success" });
        return textResult(output);
      } catch (error) {
        const message = sanitizeError(error);
        await writeAuditEntry({ tool: "list_user_groups", mode: "read", target, outcome: "error", message });
        return textResult({ error: message });
      }
    }
  );
}
