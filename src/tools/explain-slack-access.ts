import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "../config.js";
import { getUser, getUserGroups, listApplications, getApplicationGroups } from "../okta/client.js";
import { findSlackUserByEmail } from "../slack/client.js";
import { writeAuditEntry } from "../security/audit.js";
import { sanitizeError, sanitizeOutput } from "../security/sanitize.js";
import { validateEmail } from "../security/validate.js";
import { textResult } from "./format.js";

export function registerExplainSlackAccess(server: McpServer): void {
  server.tool(
    "explain_slack_access",
    "Explain whether an Okta user appears to have Slack access and why, using Okta groups plus Slack user state.",
    { email: z.string().email() },
    async ({ email }) => {
      const normalized = validateEmail(email);
      try {
        const oktaUser = await getUser(normalized);
        const userGroups = await getUserGroups(oktaUser.id);
        const userGroupNames = userGroups.map((group) => group.profile.name);
        const matchedAccessGroups = userGroupNames.filter((name) => config.slackAccessGroups.includes(name));

        const slackApps = await listApplications("Slack");
        const activeSlackApps = slackApps.filter((app) => app.status === "ACTIVE");
        const appGroupResults = await Promise.all(
          activeSlackApps.map(async (app) => ({
            app,
            assignedGroups: await getApplicationGroups(app.id).catch(() => [])
          }))
        );
        const slackAssignedGroupNames = new Set(
          appGroupResults.flatMap((result) => result.assignedGroups.map((group) => group.profile.name))
        );
        const matchedAppAssignedGroups = userGroupNames.filter((name) => slackAssignedGroupNames.has(name));

        const slackLookup = await findSlackUserByEmail(normalized)
          .then((user) => ({ ok: true as const, user }))
          .catch((error) => ({ ok: false as const, error: sanitizeError(error) }));
        const output = sanitizeOutput({
          email: normalized,
          okta: {
            status: oktaUser.status,
            userType: oktaUser.profile.userType,
            department: oktaUser.profile.department,
            groups: userGroupNames
          },
          slack: !slackLookup.ok
            ? { lookupStatus: "not_checked", error: slackLookup.error }
            : {
                lookupStatus: slackLookup.user ? "matched" : "not_found",
                id: slackLookup.user?.id,
                deleted: slackLookup.user?.deleted,
                isAdmin: slackLookup.user?.is_admin,
                isOwner: slackLookup.user?.is_owner
              },
          accessEvidence: {
            configuredSlackAccessGroups: config.slackAccessGroups,
            matchedConfiguredAccessGroups: matchedAccessGroups,
            activeSlackApps: activeSlackApps.map((app) => ({ id: app.id, label: app.label, signOnMode: app.signOnMode })),
            matchedOktaAppAssignedGroups: matchedAppAssignedGroups
          },
          conclusion: buildConclusion({
            oktaStatus: oktaUser.status,
            slackDeleted: slackLookup.ok ? slackLookup.user?.deleted : undefined,
            matchedConfiguredAccessGroups: matchedAccessGroups,
            matchedOktaAppAssignedGroups: matchedAppAssignedGroups
          })
        });
        await writeAuditEntry({ tool: "explain_slack_access", mode: "read", target: normalized, outcome: "success" });
        return textResult(output);
      } catch (error) {
        const message = sanitizeError(error);
        await writeAuditEntry({ tool: "explain_slack_access", mode: "read", target: normalized, outcome: "error", message });
        return textResult({ error: message });
      }
    }
  );
}

function buildConclusion(input: {
  oktaStatus: string;
  slackDeleted?: boolean;
  matchedConfiguredAccessGroups: string[];
  matchedOktaAppAssignedGroups: string[];
}): string {
  if (input.oktaStatus !== "ACTIVE") {
    return `User is ${input.oktaStatus} in Okta. Investigate before granting or relying on Slack access.`;
  }
  if (input.slackDeleted === true) {
    return "User matches Okta access groups, but the Slack account is deactivated.";
  }
  if (input.matchedOktaAppAssignedGroups.length > 0) {
    return `User appears to inherit Slack through Okta app-assigned group(s): ${input.matchedOktaAppAssignedGroups.join(", ")}.`;
  }
  if (input.matchedConfiguredAccessGroups.length > 0) {
    return `User is in configured Slack access group(s): ${input.matchedConfiguredAccessGroups.join(", ")}, but Okta app assignment evidence was not found.`;
  }
  return "No configured Okta group evidence for Slack access was found.";
}
