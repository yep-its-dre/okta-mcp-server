import { readFile } from "node:fs/promises";
import { createPublicKey } from "node:crypto";
import { decodeProtectedHeader, importPKCS8, SignJWT } from "jose";
import { randomUUID } from "node:crypto";

const domain = process.env.OKTA_DOMAIN;
const clientId = process.env.OKTA_CLIENT_ID;
const keyId = process.env.OKTA_KEY_ID;
const privateKeyFile = process.env.OKTA_PRIVATE_KEY_FILE;

if (!domain || !clientId || !keyId || !privateKeyFile) {
  throw new Error("OKTA_DOMAIN, OKTA_CLIENT_ID, OKTA_KEY_ID, and OKTA_PRIVATE_KEY_FILE are required");
}

const privatePem = await readFile(privateKeyFile, "utf8");
const publicJwk = createPublicKey(privatePem).export({ format: "jwk" });
const tokenEndpoint = `https://${domain}/oauth2/v1/token`;
const now = Math.floor(Date.now() / 1000);
const key = await importPKCS8(privatePem, "RS256");
const assertion = await new SignJWT({})
  .setProtectedHeader({ alg: "RS256", kid: keyId })
  .setIssuer(clientId)
  .setSubject(clientId)
  .setAudience(tokenEndpoint)
  .setIssuedAt(now)
  .setExpirationTime(now + 300)
  .setJti(randomUUID())
  .sign(key);

const [, payload] = assertion.split(".");
const decodedPayload = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;

console.log("JWT header:");
console.log(JSON.stringify(decodeProtectedHeader(assertion), null, 2));
console.log("");
console.log("JWT claims:");
console.log(JSON.stringify(decodedPayload, null, 2));
console.log("");
console.log("Public JWK from local private key:");
console.log(JSON.stringify({ ...publicJwk, kid: keyId, use: "sig", alg: "RS256" }, null, 2));
