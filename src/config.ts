import { z } from "zod";

const domainSchema = z
  .string()
  .min(1)
  .regex(/^[a-zA-Z0-9.-]+\.okta(?:preview)?\.com$/, "Use the native Okta org domain, for example dev-12345678.okta.com");

const envSchema = z.object({
  OKTA_DOMAIN: domainSchema,
  OKTA_CLIENT_ID: z.string().min(1),
  OKTA_CLIENT_SECRET: z.string().optional(),
  OKTA_PRIVATE_KEY: z.string().optional(),
  OKTA_PRIVATE_KEY_FILE: z.string().optional(),
  OKTA_KEY_ID: z.string().optional(),
  SLACK_BOT_TOKEN: z.string().optional(),
  SLACK_APP_TOKEN: z.string().optional(),
  SLACK_TEAM_ID: z.string().optional(),
  SLACK_OKTA_ACCESS_GROUPS: z.string().optional(),
  AUDIT_LOG_PATH: z.string().default("./audit.log")
}).refine((env) => env.OKTA_PRIVATE_KEY || env.OKTA_PRIVATE_KEY_FILE || env.OKTA_CLIENT_SECRET, {
  message: "Set OKTA_PRIVATE_KEY_FILE, OKTA_PRIVATE_KEY, or OKTA_CLIENT_SECRET",
  path: ["OKTA_PRIVATE_KEY_FILE"]
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid MCP server configuration: ${details}`);
}

export const config = {
  oktaDomain: parsed.data.OKTA_DOMAIN,
  oktaClientId: parsed.data.OKTA_CLIENT_ID,
  oktaClientSecret: parsed.data.OKTA_CLIENT_SECRET,
  oktaPrivateKey: parsed.data.OKTA_PRIVATE_KEY,
  oktaPrivateKeyFile: parsed.data.OKTA_PRIVATE_KEY_FILE,
  oktaKeyId: parsed.data.OKTA_KEY_ID,
  slackBotToken: parsed.data.SLACK_BOT_TOKEN,
  slackAppToken: parsed.data.SLACK_APP_TOKEN,
  slackTeamId: parsed.data.SLACK_TEAM_ID,
  slackAccessGroups: (parsed.data.SLACK_OKTA_ACCESS_GROUPS ?? "app-default-users,app-contractor-default-users,app-slack-users")
    .split(",")
    .map((group) => group.trim())
    .filter(Boolean),
  auditLogPath: parsed.data.AUDIT_LOG_PATH
};
