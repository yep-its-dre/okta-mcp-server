import { getSystemLog, listApplications } from "../src/okta/client.js";
import { listSlackUsers } from "../src/slack/client.js";

async function main() {
  console.log("Checking Okta connection...");
  const apps = await listApplications("Slack");
  const logs = await getSystemLog({ limit: 1 });
  console.log(`Okta OK: found ${apps.length} Slack app match(es), read ${logs.length} system log event(s).`);

  console.log("Checking Slack connection...");
  const users = await listSlackUsers();
  const activeHumans = users.filter((user) => !user.deleted && !user.is_bot).length;
  console.log(`Slack OK: read ${users.length} user record(s), ${activeHumans} active non-bot user(s).`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Connection check failed: ${message.replace(/Bearer\s+\S+/g, "Bearer [REDACTED]")}`);
  process.exitCode = 1;
});
