import { loadEnv } from "./env.js";
import { startServer } from "./server.js";

async function main() {
  const env = loadEnv();

  if (process.env.NODE_ENV !== "test") {
    console.info(
      `[${env.MCP_SERVER_NAME}] Starting YNAB MCP server on stdio transport.`,
    );
  }

  await startServer(env);
}

void main();
