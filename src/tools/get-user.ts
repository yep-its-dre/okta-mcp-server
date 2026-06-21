import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { writeAuditEntry } from "../security/audit.js";
import { sanitizeError, sanitizeOutput } from "../security/sanitize.js";
import { textResult } from "./format.js";
import { resolveUser } from "./resolve-user.js";

export function registerGetUser(server: McpServer): void {
  server.tool(
    "get_user",
    "Look up an Okta user by email/login or by a name query and return sanitized profile/status fields. Use email when available; use query for names.",
    { email: z.string().email().optional(), query: z.string().optional() },
    async ({ email, query }) => {
      const target = email ?? query ?? "unknown";
      try {
        const { user, target: resolvedTarget, resolution } = await resolveUser({ email, query });
        const output = sanitizeOutput({
          id: user.id,
          status: user.status,
          login: user.profile.login,
          email: user.profile.email,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          userType: user.profile.userType,
          department: user.profile.department,
          title: user.profile.title,
          lastLogin: user.lastLogin,
          passwordChanged: user.passwordChanged,
          resolvedFrom: resolution
        });
        await writeAuditEntry({ tool: "get_user", mode: "read", target: resolvedTarget, outcome: "success" });
        return textResult(output);
      } catch (error) {
        const message = sanitizeError(error);
        await writeAuditEntry({ tool: "get_user", mode: "read", target, outcome: "error", message });
        return textResult({ error: message });
      }
    }
  );
}
