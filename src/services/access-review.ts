import { config } from "../config.js";
import { getUser, getUserGroups, listApplications, getApplicationGroups } from "../okta/client.js";
import type { OktaUser } from "../okta/types.js";
import { findSlackUserByEmail, listSlackUsers } from "../slack/client.js";
import { sanitizeError, sanitizeOutput } from "../security/sanitize.js";
import { validateLimit } from "../security/validate.js";
import { resolveUser, type UserLookupInput } from "../tools/resolve-user.js";

export type SlackAccessExplanation = {
  email: string;
  resolvedFrom: "email" | "query";
  okta: {
    status: string;
    userType?: string;
    department?: string;
    groups: string[];
  };
  slack: {
    lookupStatus: "matched" | "not_found" | "not_checked";
    id?: string;
    deleted?: boolean;
    isAdmin?: boolean;
    isOwner?: boolean;
    error?: string;
  };
  accessEvidence: {
    configuredSlackAccessGroups: string[];
    matchedConfiguredAccessGroups: string[];
    activeSlackApps: Array<{ id: string; label: string; signOnMode?: string }>;
    matchedOktaAppAssignedGroups: string[];
  };
  conclusion: string;
};

export type ShadowSlackUsersResult = {
  checked: number;
  findings: Array<{
    email: string;
    slackUserId: string;
    slackStatus: "active";
    oktaStatus: string;
    finding: string;
  }>;
};

export async function explainSlackAccess(input: UserLookupInput): Promise<SlackAccessExplanation> {
  const { user: oktaUser, resolution } = await resolveUser(input);
  const normalized = oktaUser.profile.email.toLowerCase();
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

  return sanitizeOutput({
    email: normalized,
    resolvedFrom: resolution,
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
  }) as SlackAccessExplanation;
}

export async function findShadowSlackUsers(limit?: number): Promise<ShadowSlackUsersResult> {
  const max = validateLimit(limit, 25, 1, 100);
  const slackUsers = (await listSlackUsers())
    .filter((user) => !user.deleted && !user.is_bot && user.profile?.email)
    .slice(0, max);
  const findings: ShadowSlackUsersResult["findings"] = [];

  for (const slackUser of slackUsers) {
    const email = slackUser.profile?.email;
    if (!email) continue;
    try {
      const oktaUser = await getUser(email.toLowerCase());
      if (oktaUser.status !== "ACTIVE") {
        findings.push(buildFinding(email, slackUser.id, oktaUser));
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

  return sanitizeOutput({ checked: slackUsers.length, findings }) as ShadowSlackUsersResult;
}

function buildFinding(email: string, slackUserId: string, oktaUser: OktaUser): ShadowSlackUsersResult["findings"][number] {
  return {
    email,
    slackUserId,
    slackStatus: "active",
    oktaStatus: oktaUser.status,
    finding: "Slack account active while Okta user is not ACTIVE"
  };
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
