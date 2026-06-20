import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getUser, getUserGroups } from "../okta/client.js";
import { writeAuditEntry } from "../security/audit.js";
import { sanitizeError, sanitizeOutput } from "../security/sanitize.js";
import { validateEmail } from "../security/validate.js";
import { textResult } from "./format.js";

export function registerListUserGroups(server: McpServer): void {
  server.tool(
    "list_user_groups",
    "List Okta groups for a user and show group names, descriptions, and group types.",
    { email: z.string().email() },
    async ({ email }) => {
      const normalized = validateEmail(email);
      try {
        const user = await getUser(normalized);
        const groups = await getUserGroups(user.id);
        const output = sanitizeOutput(
          groups.map((group) => ({
            id: group.id,
            name: group.profile.name,
            description: group.profile.description,
            type: group.type
          }))
        );
        await writeAuditEntry({ tool: "list_user_groups", mode: "read", target: normalized, outcome: "success" });
        return textResult(output);
      } catch (error) {
        const message = sanitizeError(error);
        await writeAuditEntry({ tool: "list_user_groups", mode: "read", target: normalized, outcome: "error", message });
        return textResult({ error: message });
      }
    }
  );
}
