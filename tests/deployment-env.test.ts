import { afterEach, describe, expect, it } from "vitest";
import {
  areWriteRoutesDisabled,
  getEventsRevalidateSeconds,
  getOpsRevalidateSeconds,
  getPublicOpsMode,
  resetEnvCacheForTests,
} from "@/lib/env";

const originalEnv = {
  PUBLIC_OPS_MODE: process.env.PUBLIC_OPS_MODE,
  DISABLE_WRITE_ROUTES: process.env.DISABLE_WRITE_ROUTES,
  OPS_SECRET: process.env.OPS_SECRET,
  EVENTS_REVALIDATE_SECONDS: process.env.EVENTS_REVALIDATE_SECONDS,
  OPS_REVALIDATE_SECONDS: process.env.OPS_REVALIDATE_SECONDS,
};

function restoreEnvValue(key: keyof typeof originalEnv) {
  const value = originalEnv[key];
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

afterEach(() => {
  restoreEnvValue("PUBLIC_OPS_MODE");
  restoreEnvValue("DISABLE_WRITE_ROUTES");
  restoreEnvValue("OPS_SECRET");
  restoreEnvValue("EVENTS_REVALIDATE_SECONDS");
  restoreEnvValue("OPS_REVALIDATE_SECONDS");
  resetEnvCacheForTests();
});

describe("deployment env flags", () => {
  it("defaults ops mode to full", () => {
    delete process.env.PUBLIC_OPS_MODE;
    resetEnvCacheForTests();
    expect(getPublicOpsMode()).toBe("full");
  });

  it("disables write routes when the flag is set", () => {
    process.env.DISABLE_WRITE_ROUTES = "1";
    process.env.OPS_SECRET = "secret";
    resetEnvCacheForTests();
    expect(areWriteRoutesDisabled()).toBe(true);
  });

  it("disables write routes when OPS_SECRET is absent", () => {
    delete process.env.DISABLE_WRITE_ROUTES;
    delete process.env.OPS_SECRET;
    resetEnvCacheForTests();
    expect(areWriteRoutesDisabled()).toBe(true);
  });

  it("reads cache TTLs from env", () => {
    process.env.EVENTS_REVALIDATE_SECONDS = "120";
    process.env.OPS_REVALIDATE_SECONDS = "900";
    process.env.OPS_SECRET = "secret";
    resetEnvCacheForTests();
    expect(getEventsRevalidateSeconds()).toBe(120);
    expect(getOpsRevalidateSeconds()).toBe(900);
  });
});
