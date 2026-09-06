import { test, expect } from "@playwright/test";
test("all breathing patterns complete four cycles; pause holds the count", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("status").filter({ hasText: "Sedia luar talian" }),
  ).toBeVisible();
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Breathe with me", exact: true })
    .click();
  await page.clock.install();
  for (const [value, seconds] of [
    ["0", 40],
    ["1", 64],
    ["2", 76],
  ] as const) {
    await page.getByLabel("Pilih teknik").selectOption(value);
    await page.getByRole("button", { name: "Mula", exact: true }).click();
    await page.clock.runFor(3000);
    await page.getByRole("button", { name: "Jeda", exact: true }).click();
    await page.clock.runFor(10000);
    await expect(page.locator(".breathing-orb")).toContainText("Dijeda");
    await page.getByRole("button", { name: "Sambung", exact: true }).click();
    await page.clock.runFor((seconds - 3) * 1000);
    await expect(page.locator(".breathing-orb")).toContainText(
      "Selesai. Terima kasih.",
    );
  }
});
