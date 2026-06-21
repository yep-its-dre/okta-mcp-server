const token = process.env.SLACK_BOT_TOKEN;

if (!token) {
  throw new Error("SLACK_BOT_TOKEN is required");
}

const response = await fetch("https://slack.com/api/auth.test", {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/json"
  }
});

const data = (await response.json()) as Record<string, unknown>;

console.log(JSON.stringify({
  ok: data.ok,
  url: data.url,
  team: data.team,
  team_id: data.team_id,
  enterprise_id: data.enterprise_id,
  user: data.user,
  user_id: data.user_id,
  bot_id: data.bot_id,
  error: data.error
}, null, 2));
