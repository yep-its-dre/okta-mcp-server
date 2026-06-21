import { generateKeyPairSync, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { exportJWK, importSPKI } from "jose";

const kid = `okta-mcp-${randomBytes(4).toString("hex")}`;
const privateKeyPath = "keys/okta-mcp-readonly-private.pem";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: "spki",
    format: "pem"
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem"
  }
});

mkdirSync("keys", { recursive: true });
writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });

const publicJwk = await exportJWK(await importSPKI(publicKey, "RS256"));
const jwk = {
  ...publicJwk,
  kid,
  use: "sig",
  alg: "RS256"
};

console.log(`Private key written locally to: ${privateKeyPath}`);
console.log("");
console.log("Add this public JWK to the Okta service app:");
console.log(JSON.stringify(jwk, null, 2));
console.log("");
console.log("Then add these to .env:");
console.log(`OKTA_PRIVATE_KEY_FILE=./${privateKeyPath}`);
console.log(`OKTA_KEY_ID=${kid}`);
