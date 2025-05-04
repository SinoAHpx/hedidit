import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Create server instance
const server = new McpServer({
    name: "hedidit",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});