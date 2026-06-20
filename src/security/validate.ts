const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_EVENT_TYPES = new Set([
  "user.session.start",
  "user.session.end",
  "user.authentication.auth_via_mfa",
  "user.authentication.auth_via_IDP",
  "user.authentication.failed",
  "user.lifecycle.activate",
  "user.lifecycle.suspend",
  "user.lifecycle.unsuspend",
  "group.user_membership.add",
  "group.user_membership.remove",
  "application.user_membership.add",
  "application.user_membership.remove",
  "system.org.rate_limit.warning"
]);

export function validateEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) {
    throw new Error(`Invalid email address: ${email}`);
  }
  return normalized;
}

export function validateLimit(limit: unknown, defaultValue = 25, min = 1, max = 100): number {
  if (limit === undefined || limit === null) return defaultValue;
  if (typeof limit !== "number" || !Number.isInteger(limit)) {
    throw new Error("limit must be an integer");
  }
  if (limit < min || limit > max) {
    throw new Error(`limit must be between ${min} and ${max}`);
  }
  return limit;
}

export function validateIsoDate(value: string | undefined, field: string): string | undefined {
  if (!value) return undefined;
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be an ISO 8601 date`);
  }
  return value;
}

export function validateEventType(eventType: string | undefined): string | undefined {
  if (!eventType) return undefined;
  if (!ALLOWED_EVENT_TYPES.has(eventType)) {
    throw new Error(`Unsupported eventType: ${eventType}`);
  }
  return eventType;
}

export function validateLogQuery(query: string | undefined): string | undefined {
  if (!query) return undefined;
  if (query.length > 100) {
    throw new Error("query must be 100 characters or fewer");
  }
  if (!/^[\x20-\x7E]+$/.test(query)) {
    throw new Error("query must contain printable ASCII only");
  }
  if (/[()]/.test(query) || /\b(eq|co|and|or|sw|gt|lt)\b/i.test(query)) {
    throw new Error("query supports keyword search only, not Okta filter syntax");
  }
  return query;
}
