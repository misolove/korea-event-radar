import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { discoverGenericLinks } from "@/ingestion/extractors/generic";

function fixture(name: string) {
  return fs.readFileSync(path.resolve(__dirname, "fixtures", name), "utf8");
}

describe("discoverGenericLinks", () => {
  it("finds expanded event hosts from official pages", () => {
    const links = discoverGenericLinks("https://example.com/community", fixture("discovery-links.html"));
    expect(links).toContain("https://event-us.kr/awskrug/event/111847");
    expect(links).toContain(
      "https://gdg.community.dev/events/details/google-gdg-seoul-presents-2025-io-extended-seoul/",
    );
    expect(links).toContain("https://ticketa.co/event/871axvkx");
    expect(links).toContain("https://developer.microsoft.com/ko-kr/reactor/events/25731/");
    expect(links).not.toContain(
      "https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fai",
    );
    expect(links).not.toContain("https://example.com/blog-post");
  });
});
