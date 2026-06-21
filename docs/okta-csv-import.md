# Okta CSV Import

This CSV is for manually seeding demo users when Slack SCIM import is unavailable.

File:

```text
data/okta-demo-users.csv
```

## Columns

Okta requires these fields for user CSV import:

```text
login
firstName
lastName
email
```

The demo CSV also includes:

```text
userType
department
title
```

These fields support group rules such as:

```text
user.userType == "Employee"
```

```text
user.userType == "Employee" && user.department == "Engineering"
```

## Before Import

In Okta, confirm the Okta User profile has these variable names:

```text
userType
department
title
```

Check:

```text
Directory > Profile Editor > Okta User
```

If `userType` does not exist, add it as a string attribute before importing.

## Import Steps

1. Go to `Directory > People`.
2. Click `More Actions`.
3. Choose `Import Users from CSV`.
4. Upload `data/okta-demo-users.csv`.
5. Review validation results.
6. Choose `Automatically activate new users` if you want the users active immediately.
7. Click `Import Users`.

## After Import

Confirm group rules ran:

```text
Directory > Groups > app-default-users > People
Directory > Groups > dept-engineering > People
Directory > Groups > app-github-users > People
Directory > Groups > app-contractor-default-users > People
```

## Notes

- The CSV uses `@inkspiretee.com` addresses.
- If your Okta org requires real email delivery, use activation settings carefully.
- If Okta rejects a column, download the error report and compare the header with the Okta User profile variable name.
- Okta's CSV import template is based on your current Okta user profile. If your downloaded template uses different variable names, copy the rows from this file into that template and keep Okta's header row.

