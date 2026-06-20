# Sample Demo Prompts

Use these prompts from Claude Desktop, Claude Code, Cursor, or any MCP host after the server is configured.

## Video 1: Okta IT Operations Investigation

```text
Use the Okta IT Operations MCP server to look up eng.employee@inkspiretee.com.
Summarize the user's Okta status, department, user type, and last login.
```

```text
List the Okta groups for eng.employee@inkspiretee.com and explain what access those groups probably grant.
```

```text
Search the Okta System Log for recent sign-in and MFA events for eng.employee@inkspiretee.com.
Limit the result to 10 events.
```

```text
Show the last 10 local MCP audit log entries and summarize which tools were used.
```

## Video 2: Okta + Slack Access Investigation

```text
Explain whether eng.employee@inkspiretee.com has Slack access and why.
Focus on whether access comes from app-default-users or another Okta group.
```

```text
Explain whether contractor.user@inkspiretee.com has Slack access and whether that access path looks appropriate for a contractor.
```

```text
Find active Slack users that do not cleanly match an active Okta user.
Limit the check to 25 Slack users.
```

