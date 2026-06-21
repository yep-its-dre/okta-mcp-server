import { config } from "../config.js";
import type { OktaApplication, OktaGroup, OktaLogEvent, OktaUser } from "./types.js";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { importPKCS8, SignJWT } from "jose";

type TokenState = {
  accessToken: string;
  expiresAt: number;
};

let tokenState: TokenState | undefined;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenState && tokenState.expiresAt - now > 60_000) {
    return tokenState.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "okta.users.read okta.groups.read okta.logs.read okta.apps.read"
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json"
  };

  if (config.oktaPrivateKey || config.oktaPrivateKeyFile) {
    body.set("client_id", config.oktaClientId);
    body.set("client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer");
    body.set("client_assertion", await createClientAssertion());
  } else if (config.oktaClientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${config.oktaClientId}:${config.oktaClientSecret}`).toString("base64")}`;
  } else {
    throw new Error("No Okta client authentication method configured");
  }

  const response = await fetch(`https://${config.oktaDomain}/oauth2/v1/token`, {
    method: "POST",
    headers,
    body
  });

  if (!response.ok) {
    throw new Error(`Okta token request failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  tokenState = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000
  };
  return data.access_token;
}

async function createClientAssertion(): Promise<string> {
  const tokenEndpoint = `https://${config.oktaDomain}/oauth2/v1/token`;
  const privateKeyPem = config.oktaPrivateKeyFile
    ? await readFile(config.oktaPrivateKeyFile, "utf8")
    : config.oktaPrivateKey?.replace(/\\n/g, "\n");

  if (!privateKeyPem) {
    throw new Error("OKTA_PRIVATE_KEY or OKTA_PRIVATE_KEY_FILE is required for private_key_jwt");
  }

  const key = await importPKCS8(privateKeyPem, "RS256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({
      alg: "RS256",
      kid: config.oktaKeyId
    })
    .setIssuer(config.oktaClientId)
    .setSubject(config.oktaClientId)
    .setAudience(tokenEndpoint)
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .setJti(randomUUID())
    .sign(key);
}

async function oktaGet<T>(path: string, query?: URLSearchParams): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(`https://${config.oktaDomain}${path}`);
  query?.forEach((value, key) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Okta API request failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as T;
}

export async function getUser(login: string): Promise<OktaUser> {
  return oktaGet<OktaUser>(`/api/v1/users/${encodeURIComponent(login)}`);
}

export async function searchUsers(query: string, limit = 10): Promise<OktaUser[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit)
  });
  return oktaGet<OktaUser[]>("/api/v1/users", params);
}

export async function getUserGroups(userId: string): Promise<OktaGroup[]> {
  return oktaGet<OktaGroup[]>(`/api/v1/users/${encodeURIComponent(userId)}/groups`);
}

export async function listApplications(query?: string): Promise<OktaApplication[]> {
  const params = new URLSearchParams({ limit: "200" });
  if (query) params.set("q", query);
  return oktaGet<OktaApplication[]>("/api/v1/apps", params);
}

export async function getApplicationGroups(appId: string): Promise<OktaGroup[]> {
  return oktaGet<OktaGroup[]>(`/api/v1/apps/${encodeURIComponent(appId)}/groups`);
}

export async function getSystemLog(params: {
  query?: string;
  eventType?: string;
  since?: string;
  until?: string;
  limit: number;
}): Promise<OktaLogEvent[]> {
  const query = new URLSearchParams({ limit: String(params.limit) });
  if (params.query) query.set("q", params.query);
  if (params.eventType) query.set("filter", `eventType eq "${params.eventType}"`);
  if (params.since) query.set("since", params.since);
  if (params.until) query.set("until", params.until);
  return oktaGet<OktaLogEvent[]>("/api/v1/logs", query);
}
