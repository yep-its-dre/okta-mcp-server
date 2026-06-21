import { App } from "@slack/bolt";
import { config } from "./config.js";
import { explainSlackAccess, findShadowSlackUsers, type SlackAccessExplanation } from "./services/access-review.js";
import { getUserGroups } from "./okta/client.js";
import { sanitizeError } from "./security/sanitize.js";
import { resolveUser } from "./tools/resolve-user.js";

if (!config.slackBotToken) {
  throw new Error("SLACK_BOT_TOKEN is required for the Slack bot");
}

if (!config.slackAppToken) {
  throw new Error("SLACK_APP_TOKEN is required for Socket Mode. Create an app-level token with connections:write.");
}

const app = new App({
  token: config.slackBotToken,
  appToken: config.slackAppToken,
  socketMode: true
});

app.event("app_mention", async ({ event, say }) => {
  const text = "text" in event ? stripMention(event.text) : "";
  console.log(`Received app mention: ${text}`);
  await say(await handleCommand(text));
});

app.message(async ({ message, say }) => {
  if ("subtype" in message && message.subtype) return;
  if (!("channel_type" in message) || message.channel_type !== "im") return;
  const text = "text" in message ? message.text ?? "" : "";
  await say(await handleCommand(text));
});

await app.start();
console.log("Okta IT Ops Slack bot is running in Socket Mode.");

async function handleCommand(text: string): Promise<string> {
  const normalized = text.trim();
  if (!normalized || /^help$/i.test(normalized)) {
    return helpText();
  }

  const explainMatch =
    normalized.match(/^(?:explain|access|slack access)\s+(.+)$/i) ??
    normalized.match(/^what access does\s+(.+?)\s+have\??$/i) ??
    normalized.match(/^why does\s+(.+?)\s+have\s+slack access\??$/i) ??
    normalized.match(/^tell me about\s+(.+?)'?s\s+access\??$/i) ??
    normalized.match(/^show me\s+(.+?)'?s\s+access\??$/i) ??
    normalized.match(/^check\s+(.+?)'?s\s+access\??$/i) ??
    normalized.match(/^what about\s+(.+?)\??$/i);
  if (explainMatch) {
    try {
      const result = await explainSlackAccess({ query: explainMatch[1].trim() });
      return formatSlackAccess(result);
    } catch (error) {
      return `I couldn't explain that access: ${sanitizeError(error)}`;
    }
  }

  const oktaProfileMatch =
    normalized.match(/^tell me about\s+(.+?)'?s\s+okta\s+(?:account|profile|user)\??$/i) ??
    normalized.match(/^show me\s+(.+?)'?s\s+okta\s+(?:account|profile|user)\??$/i) ??
    normalized.match(/^lookup\s+(.+?)'?s\s+okta\s+(?:account|profile|user)\??$/i) ??
    normalized.match(/^get\s+(.+?)'?s\s+okta\s+(?:account|profile|user)\??$/i) ??
    normalized.match(/^who is\s+(.+?)\s+in\s+okta\??$/i);
  if (oktaProfileMatch) {
    try {
      const result = await resolveUser({ query: oktaProfileMatch[1].trim() });
      const groups = await getUserGroups(result.user.id);
      return formatOktaProfile(result.user, groups.map((group) => group.profile.name));
    } catch (error) {
      return `I couldn't look up that Okta account: ${sanitizeError(error)}`;
    }
  }

  const shadowMatch =
    normalized.match(/^shadow(?:\s+users)?(?:\s+(\d+))?$/i) ??
    normalized.match(/^(?:list|show|find|check)\s+(?:all\s+)?shadow\s+users(?:\s+(\d+))?$/i) ??
    normalized.match(/^(?:list|show|find|check)\s+(?:all\s+)?slack\s+users\s+(?:that\s+)?(?:do\s+not|does\s+not|don't|without|with\s+no)\s+have\s+(?:a\s+)?matching\s+okta\s+account\??$/i) ??
    normalized.match(/^(?:list|show|find|check)\s+(?:all\s+)?slack\s+users\s+(?:without|with\s+no)\s+(?:a\s+)?matching\s+okta\s+user\??$/i);
  if (shadowMatch) {
    try {
      const limit = shadowMatch[1] ? Number.parseInt(shadowMatch[1], 10) : 25;
      const result = await findShadowSlackUsers(limit);
      if (result.findings.length === 0) {
        return `Checked ${result.checked} active Slack users. No shadow-user findings found.`;
      }
      const findings = result.findings
        .slice(0, 10)
        .map((finding) => `- ${finding.email}: ${finding.finding} (${finding.oktaStatus})`)
        .join("\n");
      return `Checked ${result.checked} active Slack users. Findings:\n${findings}`;
    } catch (error) {
      return `I couldn't check shadow Slack users: ${sanitizeError(error)}`;
    }
  }

  return `I didn't recognize that request.\n\n${helpText()}`;
}

function stripMention(text: string): string {
  return text.replace(/^<@[A-Z0-9]+>\s*/, "").trim();
}

function helpText(): string {
  return [
    "*Okta IT Ops demo commands*",
    "`@Okta MCP Demo Tell me about Jane Smith's Okta account` - look up an Okta profile",
    "`@Okta MCP Demo explain Jane Smith` - explain why a user has Slack access",
    "`@Okta MCP Demo What access does Jane Smith have?` - natural-language access review",
    "`@Okta MCP Demo shadow users` - find active Slack users without clean Okta matches",
    "In a direct message, omit the mention: `explain Jane Smith`",
    "`@Okta MCP Demo help` - show this help"
  ].join("\n");
}

function formatOktaProfile(user: Awaited<ReturnType<typeof resolveUser>>["user"], groupNames: string[]): string {
  return [
    `*Okta account for ${user.profile.firstName ?? ""} ${user.profile.lastName ?? ""}*`.trim(),
    `Email: ${user.profile.email}`,
    `Status: ${user.status}`,
    `User type: ${user.profile.userType ?? "not set"}`,
    `Department: ${user.profile.department ?? "not set"}`,
    `Title: ${user.profile.title ?? "not set"}`,
    `Groups: ${groupNames.length > 0 ? groupNames.join(", ") : "none found"}`,
    `Last login: ${user.lastLogin ?? "not available"}`
  ].join("\n");
}

function formatSlackAccess(result: SlackAccessExplanation): string {
  const groupEvidence =
    result.accessEvidence.matchedOktaAppAssignedGroups.length > 0
      ? result.accessEvidence.matchedOktaAppAssignedGroups.join(", ")
      : result.accessEvidence.matchedConfiguredAccessGroups.join(", ") || "none found";
  const slackRoleFlags = [
    result.slack.isOwner ? "Owner" : undefined,
    result.slack.isAdmin ? "Admin" : undefined
  ].filter(Boolean);

  return [
    `*Slack access review for ${result.email}*`,
    `Okta status: ${result.okta.status}`,
    `Department: ${result.okta.department ?? "not set"}`,
    `Slack account: ${result.slack.lookupStatus}${result.slack.deleted ? " (deactivated)" : ""}`,
    `Slack privileged role: ${slackRoleFlags.length > 0 ? slackRoleFlags.join(", ") : "none detected"}`,
    `Access evidence: ${groupEvidence}`,
    `Conclusion: ${result.conclusion}`
  ].join("\n");
}
