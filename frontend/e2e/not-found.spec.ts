import { test, expect } from "@playwright/test";

test.describe("404 페이지", () => {
  test("비로그인 상태에서 존재하지 않는 경로 → 커스텀 404 페이지 표시", async ({ page }) => {
    await page.goto("/this-path-does-not-exist-xyz");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText("페이지를 찾을 수 없어요")).toBeVisible();
    await expect(page.getByRole("link", { name: "대시보드로 가기" })).toBeVisible();
  });

  test("비로그인 상태에서 / 접속 → /login 리다이렉트 (기존 보호 동작 유지)", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("404 페이지 '대시보드로 가기' 링크가 / 를 가리킴", async ({ page }) => {
    await page.goto("/nonexistent-page-abc");
    const link = page.getByRole("link", { name: "대시보드로 가기" });
    await expect(link).toHaveAttribute("href", "/");
  });
});
