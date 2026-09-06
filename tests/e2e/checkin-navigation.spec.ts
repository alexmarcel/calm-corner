import { test, expect } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

test("first visit, repeated activation, onboarding continuation and returning visit", async ({
  page,
}) => {
  await page.goto("/");
  const cta = page.getByRole("link", { name: "Mari check-in" });
  await cta.click();
  await expect(page.locator("#onboarding")).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Mulakan ruang saya" }),
  ).toBeDisabled();
  await cta.click();
  await expect(page.locator("#onboarding")).toBeFocused();
  await page.getByLabel("Saya berumur 18 tahun atau lebih.").check();
  await page
    .getByLabel("Saya faham cara data disimpan pada peranti ini.")
    .check();
  await page.getByRole("button", { name: "Mulakan ruang saya" }).click();
  await expect(page.locator("#checkin")).toBeFocused();
  await expect
    .poll(async () => {
      const checkin = await page.locator("#checkin").boundingBox();
      const banner = (await page.locator(".install-banner").count())
        ? await page.locator(".install-banner").boundingBox()
        : null;
      return checkin!.y >= 0 && checkin!.y < (banner?.y ?? 800);
    })
    .toBe(true);
  await page.reload();
  await cta.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#checkin")).toBeFocused();
});

test("navigation link closes mobile menu and reaches onboarding", async ({
  page,
}) => {
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu navigasi" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("link", { name: "Ruang saya", exact: true }).click();
  await expect(page.locator("#onboarding")).toBeFocused();
  await expect(page.locator("nav")).not.toHaveClass("open");
});

test("click during database loading waits for onboarding", async ({
  page,
  context,
}) => {
  const blocker = await context.newPage();
  await blocker.goto("/manifest.webmanifest");
  await blocker.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("calm-corner", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          window.addEventListener("release-db", () => request.result.close(), {
            once: true,
          });
          resolve();
        };
      }),
  );
  await page.goto("/");
  await expect(page.locator(".loading")).toBeVisible();
  await page.getByRole("link", { name: "Mari check-in" }).click();
  await blocker.evaluate(() => window.dispatchEvent(new Event("release-db")));
  await expect(page.locator("#onboarding")).toBeFocused();
  await blocker.close();
});
