# YNAB MCP Server

A TypeScript Model Context Protocol (MCP) server that wraps the [YNAB API](https://api.ynab.com/) with first-class support for transaction categorization and splitting workflows. All YNAB endpoints are exposed through a generic tool, while curated helpers simplify common budgeting tasks.

## Features

- 🔐 Environment-driven configuration with validation via `zod`.
- 🔁 Auto-generated TypeScript types and endpoint metadata derived from the live OpenAPI spec.
- 🧰 MCP tools covering:
  - Generic endpoint access (`ynab.apiRequest`)
  - Budget, account, and transaction discovery helpers
  - Focused utilities for categorizing and splitting transactions
- 🧪 Node built-in tests (`node --test`) for core client behaviour.

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
   - `YNAB_ACCESS_TOKEN` for personal access tokens **or**
   - `YNAB_CLIENT_ID`, `YNAB_CLIENT_SECRET`, `YNAB_REDIRECT_URI` for OAuth flows

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






