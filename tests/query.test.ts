import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { listEvents } from "@/db/repository";

describe("listEvents", () => {
  let origDbUrl: string | undefined;

  beforeAll(() => {
    origDbUrl = process.env.TURSO_DATABASE_URL;
    process.env.TURSO_DATABASE_URL = "";
  });

  afterAll(() => {
    process.env.TURSO_DATABASE_URL = origDbUrl;
  });

  it("filters free events from fallback dataset", async () => {
    const events = await listEvents({ priceType: "free" });
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.priceType === "free")).toBe(true);
  });

  it("filters by search term", async () => {
    const events = await listEvents({ q: "Coding with AI" });
    expect(events.some((event) => event.title.includes("Coding with AI"))).toBe(true);
  });
});
