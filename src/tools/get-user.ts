import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getUser } from "../okta/client.js";
import { writeAuditEntry } from "../security/audit.js";
import { sanitizeError, sanitizeOutput } from "../security/sanitize.js";
import { validateEmail } from "../security/validate.js";
import { textResult } from "./format.js";

export function registerGetUser(server: McpServer): void {
  server.tool(
    "get_user",
    "Look up an Okta user by email/login and return sanitized profile/status fields.",
    { email: z.string().email() },
    async ({ email }) => {
      const normalized = validateEmail(email);
      try {
        const user = await getUser(normalized);
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
          passwordChanged: user.passwordChanged
        });
        await writeAuditEntry({ tool: "get_user", mode: "read", target: normalized, outcome: "success" });
        return textResult(output);
      } catch (error) {
        const message = sanitizeError(error);
        await writeAuditEntry({ tool: "get_user", mode: "read", target: normalized, outcome: "error", message });
        return textResult({ error: message });
      }
    }
  );
}
