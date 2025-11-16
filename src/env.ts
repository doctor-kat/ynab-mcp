import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const envSchema = z
  .object({
    MCP_SERVER_NAME: z.string().min(1).default("ynab-mcp-server"),
    MCP_LISTEN_PORT: z.coerce.number().int().positive().default(3001),
    YNAB_BASE_URL: z
      .string()
      .url()
      .default("https://api.ynab.com/v1"),
    YNAB_ACCESS_TOKEN: z.string().min(1).optional(),
    YNAB_CLIENT_ID: z.string().min(1).optional(),
    YNAB_CLIENT_SECRET: z.string().min(1).optional(),
    YNAB_REDIRECT_URI: z.string().url().optional(),
  })
  .superRefine((values, ctx) => {
    const hasClientApp =
      typeof values.YNAB_CLIENT_ID === "string" &&
      typeof values.YNAB_CLIENT_SECRET === "string" &&
      typeof values.YNAB_REDIRECT_URI === "string";

    if (!values.YNAB_ACCESS_TOKEN && !hasClientApp) {
      ctx.addIssue({
        path: ["YNAB_ACCESS_TOKEN"],
        code: z.ZodIssueCode.custom,
        message:
          "Provide either YNAB_ACCESS_TOKEN or the trio YNAB_CLIENT_ID, YNAB_CLIENT_SECRET, and YNAB_REDIRECT_URI.",
      });
    }
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
    YNAB_CLIENT_ID: process.env.YNAB_CLIENT_ID,
    YNAB_CLIENT_SECRET: process.env.YNAB_CLIENT_SECRET,
    YNAB_REDIRECT_URI: process.env.YNAB_REDIRECT_URI,
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






