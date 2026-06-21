# Recording Checklist

## Before Recording

- Okta SAML app for Slack works.
- Slack app is assigned to `app-default-users`.
- Demo users exist in Okta.
- Demo users have `userType` and `department` populated.
- Group rules are active.
- `.env` contains Okta read-only API credentials.
- `.env` contains Slack bot token.
- `npm run check:connections` succeeds.
- `npm run build` succeeds.
- `npm test` succeeds.

## Video 1: Okta IT Operations MCP

Show:

1. `get_user` for an Engineering employee.
2. `list_user_groups` for the same user.
3. `search_system_log` for recent login/MFA/app events.
4. `tail_audit_log` showing local MCP audit entries.

Core message:

```text
This MCP server lets an IT admin ask an AI assistant live identity questions backed by Okta APIs, with read-only scopes and local audit logging.
```

## Video 2: Okta + Slack Access Investigation

Show:

1. `explain_slack_access` for an employee.
2. The result showing Okta groups and Slack match.
3. `find_shadow_slack_users` for Slack users without clean Okta matches.

Core message:

```text
This helps IT investigate whether Slack access is coming from the right Okta group path and whether Slack has orphaned or mismatched accounts.
```

## Do Not Show

- `.env`
- Client secrets
- Slack tokens
- Raw OAuth tokens
- Full certificates or secrets

