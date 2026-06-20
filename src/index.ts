import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerExplainSlackAccess } from "./tools/explain-slack-access.js";
import { registerFindShadowSlackUsers } from "./tools/find-shadow-slack-users.js";
import { registerGetUser } from "./tools/get-user.js";
import { registerListUserGroups } from "./tools/list-user-groups.js";
import { registerSearchSystemLog } from "./tools/search-system-log.js";
import { registerTailAuditLog } from "./tools/tail-audit-log.js";

const server = new McpServer({
  name: "okta-it-operations",
  version: "0.1.0"
});

registerGetUser(server);
registerListUserGroups(server);
registerSearchSystemLog(server);
registerTailAuditLog(server);
registerExplainSlackAccess(server);
registerFindShadowSlackUsers(server);

const transport = new StdioServerTransport();
await server.connect(transport);
