import { defineConfig } from "drizzle-kit";
import fs from "node:fs";
import path from "node:path";

const originalKeys = new Set(Object.keys(process.env));
for (const filename of [".env", ".env.local"]) {
  const fullPath = path.join(process.cwd(), filename);
  if (!fs.existsSync(fullPath)) {
    continue;
  }

  const content = fs.readFileSync(fullPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!originalKeys.has(key)) {
      process.env[key] = value;
    }
  }
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
  strict: true,
});
