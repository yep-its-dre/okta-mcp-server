# Okta Service App Private Key Setup

Okta service apps for Okta APIs can require `private_key_jwt` client authentication. This project supports that flow.

## Generate Local Key Pair

```bash
npm run generate:okta-key
```

This writes a private key to:

```text
keys/okta-mcp-readonly-private.pem
```

The `keys/` directory is gitignored.

The command also prints a public JWK.

## Add Public JWK To Okta

In Okta Admin:

```text
Applications > Applications > okta-mcp-readonly > General
```

Find the client credentials / public keys area and add the public JWK printed by the script.

Then set the client authentication method to:

```text
Public key / Private key
```

or the equivalent private-key JWT option.

## Update `.env`

Set:

```text
OKTA_PRIVATE_KEY_FILE=./keys/okta-mcp-readonly-private.pem
OKTA_KEY_ID=the-kid-printed-by-the-script
```

Remove or ignore:

```text
OKTA_CLIENT_SECRET
```

## Test

```bash
npm run check:connections
```

