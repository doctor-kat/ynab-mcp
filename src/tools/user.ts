import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getUser } from "../api/index.js";
import { errorResult, successResult } from "./utils.js";

export function registerGetUserTool(server: McpServer): void {
  const schema = z.object({});

  server.registerTool(
    "ynab.getUser",
    {
      title: "Get user",
      description: "Returns authenticated user information",
      inputSchema: schema.shape,
    },
    async () => {
      try {
        const response = await getUser();
        return successResult("User information retrieved", response);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
