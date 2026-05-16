import fs from "node:fs";
import path from "node:path";

let loaded = false;

export function loadLocalEnvFiles() {
  if (loaded) {
    return;
  }

  loaded = true;

  const cwd = process.cwd();
  const originalKeys = new Set(Object.keys(process.env));
  const fileAssignedKeys = new Set<string>();
  const candidates = [".env", ".env.local"];

  for (const filename of candidates) {
    const fullPath = path.join(cwd, filename);
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

      const shouldOverrideFromLocal =
        filename === ".env.local" && !originalKeys.has(key) && fileAssignedKeys.has(key);

      if (!originalKeys.has(key) && (!(key in process.env) || shouldOverrideFromLocal)) {
        process.env[key] = value;
        fileAssignedKeys.add(key);
      }
    }
  }
}
