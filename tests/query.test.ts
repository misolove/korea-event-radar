import { describe, expect, it } from "vitest";
import { listEvents } from "@/db/repository";

describe("listEvents", () => {
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
