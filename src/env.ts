import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const envSchema = z.object({
  MCP_SERVER_NAME: z.string().min(1).default("ynab-mcp-server"),
  MCP_LISTEN_PORT: z.coerce.number().int().positive().default(3001),
  YNAB_BASE_URL: z.string().url().default("https://api.ynab.com/v1"),
  YNAB_ACCESS_TOKEN: z
    .string()
    .min(1)
    .describe("Personal Access Token from YNAB"),
  READ_ONLY: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .default("false"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function loadEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse({
    MCP_SERVER_NAME: process.env.MCP_SERVER_NAME,
    MCP_LISTEN_PORT: process.env.MCP_LISTEN_PORT,
    YNAB_BASE_URL: process.env.YNAB_BASE_URL,
    YNAB_ACCESS_TOKEN: process.env.YNAB_ACCESS_TOKEN,
    READ_ONLY: process.env.READ_ONLY,
  });

  if (!parsed.success) {
    const formatted = parsed.error.format();
    const messages = Object.entries(formatted)
      .filter(([key]) => key !== "_errors")
      .map(([key, value]) => `${key}: ${(value as any)._errors.join(", ")}`)
      .join("; ");

    throw new Error(`Invalid environment configuration: ${messages}`);
  }

  cachedEnv = parsed.data;
  return parsed.data;
}
