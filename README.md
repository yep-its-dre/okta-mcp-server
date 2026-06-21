# Okta IT Operations MCP Server

Read-only MCP server for investigating Okta users, Okta groups, Okta System Log events, and Slack access state. The repo also includes an optional Slack bot interface that reuses the same backend services for channel-based IT operations demos.

This is built as an IT portfolio demo around IAM operations, RBAC, access investigation, and SOC 2-style access review evidence.

## What It Demonstrates

- Okta user lookup
- Okta group membership investigation
- Okta System Log search
- Local MCP audit logging
- Slack user lookup
- Okta-to-Slack access explanation
- Shadow IT / orphaned Slack account detection

## Tools

| Tool | Purpose |
|---|---|
| `get_user` | Look up an Okta user by email/login. |
| `list_user_groups` | List the Okta groups assigned to a user. |
| `search_system_log` | Search recent Okta System Log events using safe parameters. |
| `tail_audit_log` | Read the local MCP JSONL audit trail. |
| `explain_slack_access` | Explain whether a user appears to have Slack access and why. |
| `find_shadow_slack_users` | Find active Slack users without clean active Okta matches. |

## Architecture

```text
MCP host, for example Claude Desktop
  |
  | stdio
  v
Okta IT Operations MCP Server
  |-- Okta API: users, groups, apps, logs
  |-- Slack API: users
  |-- Local audit log: JSONL
```

The MCP server runs over stdio. It does not open an inbound network port. It still holds API credentials locally, so `.env` is gitignored and outputs are sanitized.

Optional Slack interface:

```text
Slack channel
  |
  | app mention
  v
Slack bot over Socket Mode
  |-- shared Okta/Slack access-review services
```

## Setup

Install dependencies:

```bash
npm install
```

Create `.env` from the template:

```bash
cp .env.example .env
```

Fill in:

```text
OKTA_DOMAIN
OKTA_CLIENT_ID
OKTA_PRIVATE_KEY_FILE
OKTA_KEY_ID
SLACK_BOT_TOKEN
SLACK_TEAM_ID
```

Use the native Okta org domain for `OKTA_DOMAIN`, for example:

```text
dev-12345678.okta.com
```

Do not use the custom sign-in domain.

## Okta API Service App

Create an Okta API Services app and grant these read-only scopes:

```text
okta.users.read
okta.groups.read
okta.logs.read
okta.apps.read
```

Use the service app client ID in `.env`.

Okta service apps for Okta APIs commonly use `private_key_jwt` client authentication. This project supports a local private key file:

```text
OKTA_PRIVATE_KEY_FILE=./keys/okta-mcp-readonly-private.pem
OKTA_KEY_ID=replace_me
```

See [docs/okta-service-app-private-key.md](./docs/okta-service-app-private-key.md).

## Slack Bot Token

Create a Slack app/bot token with read-only user scopes:

```text
users:read
users:read.email
```

Put the bot token in:

```text
SLACK_BOT_TOKEN
```

If the token is org-level on Enterprise Grid, also set the workspace/team ID:

```text
SLACK_TEAM_ID=T00000000
```

For the optional Slack bot UI, also enable Socket Mode and create an app-level token with:

```text
connections:write
```

Set:

```text
SLACK_APP_TOKEN=xapp-replace-me
```

The Slack bot also needs bot scopes for channel replies:

```text
app_mentions:read
chat:write
```

## Run

Build:

```bash
npm run build
```

Start:

```bash
npm start
```

Dev mode:

```bash
npm run dev
```

Run the optional Slack bot:

```bash
npm run slack:bot
```

## MCP Host Config

Example:

```json
{
  "mcpServers": {
    "okta-it-operations": {
      "command": "node",
      "args": ["/Users/dre/okta-mcp-server/dist/index.js"]
    }
  }
}
```

## Demo Scripts

See [sample-prompts.md](./sample-prompts.md).

If Slack SCIM is unavailable, use the manual setup path in [docs/no-scim-demo-setup.md](./docs/no-scim-demo-setup.md).

Recommended demos:

1. Okta user/group/audit investigation.
2. Okta + Slack access investigation.
3. Slack channel workflow for access review.

## Security Notes

- Read-only first: this version has no write tools.
- Credentials live in `.env`, which is gitignored.
- Tool outputs pass through sanitization to redact tokens/secrets.
- Every tool call writes to a local JSONL audit log.
- Slack investigation uses read-only user APIs.
- This is intended for a developer/demo org, not production administration.
