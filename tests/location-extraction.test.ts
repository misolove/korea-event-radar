import { describe, expect, it } from "vitest";
import { extractCityFromText, extractLocationInfo } from "@/ingestion/extractors/common";

describe("location extraction", () => {
  it("prefers busan from structured location over seoul mentions elsewhere", () => {
    const location = extractLocationInfo(
      {
        location: {
          name: "BEXCO",
          address: {
            addressLocality: "Busan",
            addressRegion: "Busan",
          },
        },
      },
      "Google for Developers Seoul community page",
    );

    expect(location.city).toBe("부산");
    expect(location.venueName).toContain("BEXCO");
  });

  it("maps english city names to korean display names", () => {
    expect(extractCityFromText("Busan Exhibition Center")).toBe("부산");
    expect(extractCityFromText("Seoul")).toBe("서울");
  });
});
