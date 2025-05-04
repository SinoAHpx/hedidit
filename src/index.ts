import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getProjectStructure } from "./tools/getProjectInfo";

const server = new McpServer({
    name: "hedidit-mcp",
    version: "1.0.0"
});

server.tool('get-project-structure', 'Get project structure based on root. It is essential function, should be called every time with your request. ', {
    root: z.string().describe("The absolute path of the project root path.")
}, async ({ root }) => {
    const result = await getProjectStructure(root);
    return {
        content: [
            {
                "type": "text",
                "text": result
            }
        ]
    }
})

const transport = new StdioServerTransport();
await server.connect(transport);