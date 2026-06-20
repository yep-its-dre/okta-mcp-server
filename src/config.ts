import { z } from "zod";

const domainSchema = z
  .string()
  .min(1)
  .regex(/^[a-zA-Z0-9.-]+\.okta(?:preview)?\.com$/, "Use the native Okta org domain, for example dev-12345678.okta.com");

const envSchema = z.object({
  OKTA_DOMAIN: domainSchema,
  OKTA_CLIENT_ID: z.string().min(1),
  OKTA_CLIENT_SECRET: z.string().min(1),
  SLACK_BOT_TOKEN: z.string().optional(),
  SLACK_OKTA_ACCESS_GROUPS: z.string().optional(),
  AUDIT_LOG_PATH: z.string().default("./audit.log")
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
  slackBotToken: parsed.data.SLACK_BOT_TOKEN,
  slackAccessGroups: (parsed.data.SLACK_OKTA_ACCESS_GROUPS ?? "app-default-users,app-contractor-default-users,app-slack-users")
    .split(",")
    .map((group) => group.trim())
    .filter(Boolean),
  auditLogPath: parsed.data.AUDIT_LOG_PATH
};
