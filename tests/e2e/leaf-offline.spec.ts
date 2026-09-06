import { test, expect } from "@playwright/test";
test("leaf shortcuts work after an offline standalone reload", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "This acceptance check targets Chromium offline reloads.",
  );
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "standalone", { value: true }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("status").filter({ hasText: "Sedia luar talian" }),
  ).toBeVisible({ timeout: 60000 });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".install-banner")).toHaveCount(0);
  await page.getByRole("button", { name: "Buka menu Calm Corner" }).click();
  await expect(page.locator(".leaf-trigger svg")).toBeVisible();
  await page
    .locator("#leaf-shortcuts")
    .getByRole("button", { name: "Latihan pernafasan" })
    .click();
  await expect(page.locator("#tool-breathe")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
