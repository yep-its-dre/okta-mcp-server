# No-SCIM Demo Setup

Use this path when Slack SCIM provisioning is unavailable or blocked. The MCP demo still works because the server only needs read access to Okta and Slack.

## Goal

Create enough realistic identity data to record:

1. Okta user, group, and audit investigation.
2. Okta + Slack access investigation.

SCIM import is not required for either video.

## Okta Groups

Create or confirm these groups:

```text
app-default-users
app-contractor-default-users
dept-engineering
dept-sales
app-github-users
```

Assign the Slack app to:

```text
app-default-users
```

Optional contractor path:

```text
app-contractor-default-users
```

## Okta Group Rules

Create these rules under `Directory > Groups > Rules`.

Default employee access:

```text
user.userType == "Employee"
```

Assign:

```text
app-default-users
```

Engineering access:

```text
user.userType == "Employee" && user.department == "Engineering"
```

Assign:

```text
dept-engineering
app-github-users
```

Contractor baseline access:

```text
user.userType == "Contractor"
```

Assign:

```text
app-contractor-default-users
```

## Demo Users

For a larger import, use:

```text
data/okta-demo-users.csv
```

Instructions are in:

```text
docs/okta-csv-import.md
```

For a smaller manual setup, create these users directly in Okta.

Create these users manually in Okta. Use email addresses that exist in Slack when possible so the Slack lookup can match.

```text
eng.employee@example.com
User Type: Employee
Department: Engineering
Title: Software Engineer
Expected groups: app-default-users, dept-engineering, app-github-users
```

```text
sales.employee@example.com
User Type: Employee
Department: Sales
Title: Account Executive
Expected groups: app-default-users
```

```text
contractor.user@example.com
User Type: Contractor
Department: Engineering
Title: Contractor
Expected groups: app-contractor-default-users
```

If Slack sandbox users have generated emails, use those real Slack emails instead of the examples above.

## Okta API Service App

Create an API Services app in Okta for read-only access.

Grant these Okta API scopes:

```text
okta.users.read
okta.groups.read
okta.logs.read
okta.apps.read
```

Store the client ID and private key configuration in `.env`. See `docs/okta-service-app-private-key.md`.

## Slack Bot Token

Use an org-level Slack app bot token with:

```text
users:read
users:read.email
```

If you run the optional Slack bot UI, also grant:

```text
app_mentions:read
chat:write
```

Store it in `.env` as:

```text
SLACK_BOT_TOKEN=xoxb-...
```

## Local Verification

After `.env` is populated:

```bash
npm run check:connections
npm run build
npm test
```

## Recording Prompts

Use `sample-prompts.md`.
