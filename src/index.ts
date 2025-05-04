import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getProjectStructure, getTechStack } from "./tools/getProjectInfo";

const server = new McpServer({
    name: "hedidit-mcp",
    version: "1.0.0"
});

server.tool('getProjectInfo', 'Get project structure and tech stack. It is essential function, should be called every time with your request. ', {
    root: z.string().describe("The absolute path of the project root path.")
}, async ({ root }) => {
    const structure = await getProjectStructure(root);
    const techStack = await getTechStack(root);
    return {
        content: [
            {
                "type": "text",
                "text": structure
            },
            {
                "type": "text",
                "text": techStack
            }
        ]
    }
})

const transport = new StdioServerTransport();
await server.connect(transport);