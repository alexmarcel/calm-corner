import { test, expect } from "@playwright/test";

test("About remains available after a Chromium offline reload", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "This acceptance check targets Chromium offline reloads.",
  );
  await page.goto("/");
  await expect(
    page.getByRole("status").filter({ hasText: "Sedia luar talian" }),
  ).toBeVisible({ timeout: 60000 });
  await context.setOffline(true);
  await page.reload();
  const menu = page.getByRole("button", { name: "Menu navigasi" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: "Tentang Kami" }).click();
  const dialog = page.getByRole("dialog", { name: "Tentang Calm Corner" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("Rabia binti Pisa", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByRole("listitem")).toHaveCount(5);
});
