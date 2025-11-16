# YNAB MCP Server

A TypeScript Model Context Protocol (MCP) server that wraps the [YNAB API](https://api.ynab.com/) with first-class support for transaction categorization and splitting workflows. All YNAB endpoints are exposed through a generic tool, while curated helpers simplify common budgeting tasks.

## Features

- 🔐 Environment-driven configuration with validation via `zod`.
- 🔁 Auto-generated TypeScript types and endpoint metadata derived from the live OpenAPI spec.
- 🧰 43 MCP tools covering:
  - Budget context system (cached budget data, minimal API calls)
  - Budget, account, and transaction discovery helpers
  - Transaction categorization and splitting with stage-review-apply workflow
  - Full YNAB API coverage (categories, payees, scheduled transactions, etc.)
- ⚡ Performance optimized for local LLMs (budget context caching, efficient data structures)
- 🧪 Comprehensive test suite using Vitest with mocked API responses.

## Getting Started

1. **Install Node.js 20+**  
   The project relies on the built-in Fetch API and the `node:test` runner.

2. **Install dependencies**  
   ```bash
   pnpm install
   ```
   You can substitute `pnpm` with `npm` or `yarn` if preferred.

3. **Configure environment variables**
   Copy `env.example` to `.env` and fill in your credentials.
   ```bash
   cp env.example .env
   ```
   - `YNAB_ACCESS_TOKEN` - Your YNAB Personal Access Token (required)
   - `READ_ONLY` - Set to `true` to enable read-only mode (optional, defaults to `false`)

4. **Generate TypeScript types**  
   ```bash
   pnpm generate:types
   ```
   This downloads the latest OpenAPI spec and emits strongly typed schemas plus endpoint metadata under `src/generated/ynab.types.ts`.

5. **Run the MCP server (stdio transport)**  
   ```bash
   pnpm dev
   ```
   The entry point dispatches to `@modelcontextprotocol/sdk` using the stdio transport, enabling integration with MCP-compatible clients.

6. **Execute tests**  
   ```bash
   pnpm test
   ```

## Connecting to LM Studio

[LM Studio](https://lmstudio.ai/) version 0.3.17+ supports Model Context Protocol (MCP) servers, allowing you to use this YNAB server with local language models.

### Prerequisites

- **LM Studio 0.3.17 or later** installed
- **Node.js 20+** and **pnpm** installed
- **YNAB Personal Access Token** configured (see step 3 in Getting Started)

### Configuration Steps

1. **Build the MCP server**
   ```bash
   pnpm install
   pnpm build
   ```
   This creates the compiled server in the `dist/` directory.

2. **Locate your project directory**
   Note the absolute path to this repository (e.g., `/home/user/ynab-mcp`).

3. **Open LM Studio's MCP configuration**
   - Launch LM Studio
   - Switch to the **Program** tab in the right sidebar
   - Click **Install** → **Edit mcp.json**
   - The in-app editor will open

4. **Add the YNAB server configuration**

   Add this configuration to your LM Studio `mcp.json`:
   ```json
   {
     "mcpServers": {
       "ynab": {
         "command": "node",
         "args": ["/absolute/path/to/ynab-mcp/dist/index.js"],
         "env": {
           "YNAB_ACCESS_TOKEN": "your-ynab-access-token-here",
           "READ_ONLY": "true"
         }
       }
     }
   }
   ```

   **Important:**
   - Replace `/absolute/path/to/ynab-mcp` with your actual repository path
   - Replace `your-ynab-access-token-here` with your [YNAB personal access token](https://api.ynab.com/)
   - Set `READ_ONLY` to `"false"` to enable write operations (use with caution)

5. **Save and reload**
   - Save the `mcp.json` file (LM Studio auto-detects changes)
   - The YNAB server will appear in your available tools
   - When the model attempts to call YNAB tools, LM Studio will show a confirmation dialog

### Security Notes

- **Never commit** your `mcp.json` with real access tokens
- LM Studio displays tool call confirmations before executing YNAB API requests
- You can whitelist frequently-used tools or manage permissions via **Tools & Integrations** in LM Studio settings
- Only install MCP servers from trusted sources

### Troubleshooting

- **Server not appearing:** Verify the absolute path to `dist/index.js` is correct
- **Authentication errors:** Double-check your `YNAB_ACCESS_TOKEN` is valid and has not expired
- **Module errors:** Ensure you ran `pnpm build` and the `dist/` directory exists
- **Token limits:** Some tools may generate large responses; consider using more capable local models

## Key Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Launch the MCP server with live TypeScript execution (`tsx`). |
| `pnpm build` | Compile TypeScript to `dist/`. |
| `pnpm start` | Run the compiled JavaScript build. |
| `pnpm generate:types` | Regenerate OpenAPI-based types using the vendored Python script. |
| `pnpm test` | Run Node built-in tests under `tests/`. |
| `pnpm clean` | Remove the `dist/` build output. |

## Project Layout

- `src/config/env.ts` – Environment loading and validation.
- `src/api/ynabClient.ts` – Typed HTTP client built on the generated `Paths` map.
- `src/server/server.ts` – MCP server factory + stdio bootstrapper.
- `src/tools/` – Tool registrations and helpers (categorize, split, list, generic request).
- `src/generated/` – Auto-generated YNAB schemas and endpoint metadata.
- `tools/generate_types.py` – Python-based generator leveraging vendored PyYAML.
- `tests/` – Node test suite for critical client behaviour.

## Notes

- The repo vendors a minimal copy of PyYAML under `tools/vendor/yaml` to avoid external dependency installation.
- All MCP responses include both a human-readable summary and structured `data` payload for downstream automation.
- When splitting transactions, the helper can optionally enforce the total to match the existing transaction amount.

Happy budgeting! 💸






