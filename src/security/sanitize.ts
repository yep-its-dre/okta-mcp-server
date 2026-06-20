const SECRET_KEY_RE = /(token|secret|credential|authorization|api[-_]?key|client[-_]?secret)/i;

export function sanitizeOutput<T>(value: T): T {
  return sanitize(value) as T;
}

export function sanitizeError(error: unknown): string {
  if (error instanceof Error) return sanitizeString(error.message);
  if (typeof error === "string") return sanitizeString(error);
  return sanitizeString(JSON.stringify(sanitize(error)));
}

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = SECRET_KEY_RE.test(key) ? "[REDACTED]" : sanitize(item);
    }
    return output;
  }

  if (typeof value === "string") return sanitizeString(value);
  return value;
}

function sanitizeString(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [REDACTED]")
    .replace(/Basic\s+[A-Za-z0-9._~+/=-]+/g, "Basic [REDACTED]");
}
