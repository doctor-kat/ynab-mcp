import { loadEnv } from "./env.js";
import { startServer } from "./server.js";

async function main() {
  const env = loadEnv();

  console.info("=".repeat(60));
  console.info(`🚀 ${env.MCP_SERVER_NAME} v0.1.0`);
  console.info("=".repeat(60));
  console.info(`📡  Transport:     stdio (Model Context Protocol)`);
  console.info(`🔗  YNAB API:      ${env.YNAB_BASE_URL}`);
  console.info(`🔐  Auth:          Personal Access Token`);
  console.info(
    `${env.READ_ONLY ? "🔒" : "✏️"}  Mode:          ${env.READ_ONLY ? "READ-ONLY" : "Read-Write"}`,
  );
  console.info("=".repeat(60));
  console.info(`📚  Documentation: https://api.ynab.com/`);
  console.info(`🔧  MCP Spec:      https://modelcontextprotocol.io/`);
  console.info("=".repeat(60));
  console.info(`✨  Server starting...\n`);

  await startServer(env);

  console.info(`✅  Server ready and listening on stdio`);
  console.info(
    `💡  The MCP server is now connected and ready to handle requests\n`,
  );
}

void main();
