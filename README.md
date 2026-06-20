# Okta IT Operations MCP Server

Read-only MCP server for investigating Okta users, Okta groups, Okta System Log events, and Slack access state.

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
MCP host
  |
  | stdio
  v
Okta IT Operations MCP Server
  |-- Okta API: users, groups, apps, logs
  |-- Slack API: users
  |-- Local audit log: JSONL
```

The server runs over stdio. It does not open an inbound network port. It still holds API credentials locally, so `.env` is gitignored and outputs are sanitized.

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
OKTA_CLIENT_SECRET
SLACK_BOT_TOKEN
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

Use its client ID and client secret in `.env`.

## Slack App Token

Create a Slack app/bot token with read-only user scopes:

```text
users:read
users:read.email
```

Put the bot token in:

```text
SLACK_BOT_TOKEN
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

Recommended videos:

1. Okta user/group/audit investigation.
2. Okta + Slack access investigation.
3. Optional: shadow IT/orphaned Slack account detection.

## Security Notes

- Read-only first: this version has no write tools.
- Credentials live in `.env`, which is gitignored.
- Tool outputs pass through sanitization to redact tokens/secrets.
- Every tool call writes to a local JSONL audit log.
- Slack investigation uses read-only user APIs.
- This is intended for a developer/demo org, not production administration.

