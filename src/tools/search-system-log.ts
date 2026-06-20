import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSystemLog } from "../okta/client.js";
import { writeAuditEntry } from "../security/audit.js";
import { sanitizeError, sanitizeOutput } from "../security/sanitize.js";
import { validateEventType, validateIsoDate, validateLimit, validateLogQuery } from "../security/validate.js";
import { textResult } from "./format.js";

export function registerSearchSystemLog(server: McpServer): void {
  server.tool(
    "search_system_log",
    "Search recent Okta System Log events using safe keyword/event/date parameters.",
    {
      query: z.string().optional(),
      eventType: z.string().optional(),
      since: z.string().optional(),
      until: z.string().optional(),
      limit: z.number().int().optional()
    },
    async ({ query, eventType, since, until, limit }) => {
      try {
        const safeParams = {
          query: validateLogQuery(query),
          eventType: validateEventType(eventType),
          since: validateIsoDate(since, "since"),
          until: validateIsoDate(until, "until"),
          limit: validateLimit(limit, 25, 1, 100)
        };
        const events = await getSystemLog(safeParams);
        const output = sanitizeOutput(
          events.map((event) => ({
            timestamp: event.published,
            eventType: event.eventType,
            severity: event.severity,
            actor: event.actor
              ? {
                  id: event.actor.id,
                  type: event.actor.type,
                  displayName: event.actor.displayName,
                  alternateId: event.actor.alternateId
                }
              : undefined,
            target: event.target?.map((target) => ({
              id: target.id,
              type: target.type,
              displayName: target.displayName,
              alternateId: target.alternateId
            })),
            outcome: event.outcome
          }))
        );
        await writeAuditEntry({ tool: "search_system_log", mode: "read", outcome: "success" });
        return textResult(output);
      } catch (error) {
        const message = sanitizeError(error);
        await writeAuditEntry({ tool: "search_system_log", mode: "read", outcome: "error", message });
        return textResult({ error: message });
      }
    }
  );
}
