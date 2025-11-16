import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getPayeeLocations,
  getPayeeLocationById,
  getPayeeLocationsByPayee,
} from "../api/index.js";
import { successResult, errorResult } from "./utils.js";

export function registerGetPayeeLocationsTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
  });

  server.registerTool(
    "ynab.getPayeeLocations",
    {
      title: "Get payee locations",
      description: "Returns all payee locations for a budget",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await getPayeeLocations(args);
        return successResult(
          `Payee locations for budget ${args.budgetId}`,
          response
        );
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}

export function registerGetPayeeLocationByIdTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    payeeLocationId: z
      .string()
      .min(1)
      .describe("The ID of the payee location"),
  });

  server.registerTool(
    "ynab.getPayeeLocationById",
    {
      title: "Get payee location by ID",
      description: "Returns a single payee location",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await getPayeeLocationById(args);
        return successResult(
          `Payee location ${args.payeeLocationId} in budget ${args.budgetId}`,
          response
        );
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}

export function registerGetPayeeLocationsByPayeeTool(server: McpServer): void {
  const schema = z.object({
    budgetId: z.string().min(1).describe("The ID of the budget"),
    payeeId: z.string().min(1).describe("The ID of the payee"),
  });

  server.registerTool(
    "ynab.getPayeeLocationsByPayee",
    {
      title: "Get payee locations by payee",
      description: "Returns all payee locations for a specific payee",
      inputSchema: schema.shape,
    },
    async (args) => {
      try {
        const response = await getPayeeLocationsByPayee(args);
        return successResult(
          `Payee locations for payee ${args.payeeId} in budget ${args.budgetId}`,
          response
        );
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
