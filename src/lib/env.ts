import { z } from "zod";
import { loadLocalEnvFiles } from "@/lib/load-local-env";

loadLocalEnvFiles();

const parseBooleanFlag = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => value === true || value === "1" || value === "true");

const envSchema = z.object({
  TURSO_DATABASE_URL: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  OPS_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5.4-mini"),
  PUBLIC_OPS_MODE: z.enum(["full", "summary", "off"]).default("full"),
  DISABLE_WRITE_ROUTES: parseBooleanFlag,
  EVENTS_REVALIDATE_SECONDS: z.coerce.number().int().positive().default(300),
  OPS_REVALIDATE_SECONDS: z.coerce.number().int().positive().default(600),
});

let cachedEnv: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }
  return cachedEnv;
}

export function getDatabaseUrl() {
  const env = getEnv();
  return env.TURSO_DATABASE_URL ?? env.DATABASE_URL;
}

export function getDatabaseAuthToken() {
  return getEnv().TURSO_AUTH_TOKEN;
}

export function hasDatabaseUrl() {
  return Boolean(getDatabaseUrl());
}

export function getPublicOpsMode() {
  return getEnv().PUBLIC_OPS_MODE;
}

export function areWriteRoutesDisabled() {
  const env = getEnv();
  return env.DISABLE_WRITE_ROUTES || !env.OPS_SECRET;
}

export function getEventsRevalidateSeconds() {
  return getEnv().EVENTS_REVALIDATE_SECONDS;
}

export function getOpsRevalidateSeconds() {
  return getEnv().OPS_REVALIDATE_SECONDS;
}

export function resetEnvCacheForTests() {
  cachedEnv = null;
}
