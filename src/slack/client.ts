import { config } from "../config.js";

export type SlackUser = {
  id: string;
  name: string;
  deleted?: boolean;
  is_bot?: boolean;
  is_admin?: boolean;
  is_owner?: boolean;
  profile?: {
    email?: string;
    real_name?: string;
    title?: string;
  };
};

export async function listSlackUsers(): Promise<SlackUser[]> {
  if (!config.slackBotToken) {
    throw new Error("SLACK_BOT_TOKEN is not configured");
  }

  const users: SlackUser[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL("https://slack.com/api/users.list");
    url.searchParams.set("limit", "200");
    if (config.slackTeamId) url.searchParams.set("team_id", config.slackTeamId);
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.slackBotToken}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Slack API request failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as {
      ok: boolean;
      error?: string;
      members?: SlackUser[];
      response_metadata?: { next_cursor?: string };
    };

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error ?? "unknown_error"}`);
    }

    users.push(...(data.members ?? []));
    cursor = data.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return users;
}

export async function findSlackUserByEmail(email: string): Promise<SlackUser | undefined> {
  const users = await listSlackUsers();
  return users.find((user) => user.profile?.email?.toLowerCase() === email.toLowerCase());
}
