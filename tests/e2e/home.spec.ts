import { expect, test } from "@playwright/test";

test("home page loads and navigates to detail", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /한국의 it·ai 행사를/i })).toBeVisible();
  await expect(page.getByText("행사 목록")).toBeVisible();

  await page.getByRole("link", { name: "상세 보기" }).first().click();
  await expect(page.getByText("근거 소스")).toBeVisible();
});
