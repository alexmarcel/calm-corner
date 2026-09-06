import { test, expect, type Page } from "@playwright/test";
test.use({ reducedMotion: "reduce" });
const trigger = (page: Page) =>
  page.getByRole("button", { name: "Buka menu Calm Corner" });
async function choose(page: Page, name: string) {
  await trigger(page).click();
  await page
    .getByRole("region", { name: "Pintasan Calm Corner" })
    .getByRole("button", { name, exact: true })
    .click();
}
async function onboard(page: Page) {
  await page.getByLabel("Saya berumur 18 tahun atau lebih.").check();
  await page
    .getByLabel("Saya faham cara data disimpan pada peranti ini.")
    .check();
  await page.getByRole("button", { name: "Mulakan ruang saya" }).click();
}
test("greeting, disclosure keyboard controls, hiding and responsive spacing", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Apa khabar hari ini?", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".leaf-greeting")).toHaveClass(/faded/, {
    timeout: 7000,
  });
  await trigger(page).focus();
  await page.keyboard.press("Enter");
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(page.locator("#leaf-shortcuts button").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger(page)).toBeFocused();
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  await trigger(page).click();
  await page.locator("h1").click();
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  const menu = page.getByRole("button", { name: "Menu navigasi" });
  if (await menu.isVisible()) {
    await menu.click();
    await expect(trigger(page)).toBeHidden();
    await menu.click();
    await expect(trigger(page)).toBeVisible();
  }
  await page.setViewportSize({ width: 360, height: 640 });
  const banner = page.locator(".install-banner");
  if (await banner.count()) {
    const leafBox = await trigger(page).boundingBox();
    const bannerBox = await banner.boundingBox();
    expect(leafBox!.y + leafBox!.height).toBeLessThan(bannerBox!.y);
  }
  await trigger(page).click();
  await page.locator("#leaf-shortcuts button").last().scrollIntoViewIfNeeded();
  await expect(page.locator("#leaf-shortcuts button").last()).toBeInViewport();
  await page.setViewportSize({ width: 740, height: 360 });
  await page.locator("#leaf-shortcuts button").last().scrollIntoViewIfNeeded();
  await expect(page.locator("#leaf-shortcuts button").last()).toBeInViewport();
  await page.keyboard.press("Escape");
});
test("journal and check-in follow onboarding; editor hides leaf", async ({
  page,
}) => {
  await page.goto("/");
  await choose(page, "Mari check-in");
  await expect(page.locator("#onboarding")).toBeFocused();
  await choose(page, "Tulis catatan");
  await expect(page.locator("#onboarding")).toBeFocused();
  await onboard(page);
  await expect(page.locator("#journal")).toBeFocused();
  await expect(trigger(page)).toBeHidden();
  await page
    .locator("#journal")
    .fill("Catatan kekal semasa menggunakan pintasan.");
  await page.locator("h1").click();
  await expect(trigger(page)).toBeVisible();
  await choose(page, "Mari check-in");
  await expect(page.locator("#checkin")).toBeFocused();
  await choose(page, "Tulis catatan");
  await expect(page.locator("#journal")).toBeFocused();
  await expect(page.locator("#journal")).toHaveValue(
    "Catatan kekal semasa menggunakan pintasan.",
  );
});
test("tool shortcuts select without autoplay; dialogs restore character focus", async ({
  page,
}) => {
  await page.goto("/");
  for (const [label, id] of [
    ["Bunyi menenangkan", "sound"],
    ["Latihan pernafasan", "breathe"],
    ["Grounding", "ground"],
  ]) {
    await choose(page, label);
    await expect(page.locator(`#tool-${id}`)).toBeFocused();
    await expect(page.locator(`#tool-${id}`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      await page
        .locator("audio")
        .evaluateAll((elements) =>
          elements.every((el) => (el as HTMLAudioElement).paused),
        ),
    ).toBe(true);
  }
  await choose(page, "Bunyi menenangkan");
  await page.getByRole("button", { name: "Main audio", exact: true }).click();
  await expect(page.getByRole("button", { name: "Jeda audio" })).toBeVisible();
  await trigger(page).click();
  await expect(page.getByRole("button", { name: "Jeda audio" })).toBeVisible();
  await page.keyboard.press("Escape");
  for (const label of ["Catatan & sejarah", "SOS / Bantuan"]) {
    await choose(page, label);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(trigger(page)).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(trigger(page)).toBeFocused();
  }
  await expect(
    page.getByRole("button", { name: "Main audio", exact: true }),
  ).toBeVisible();
});
test("latest shortcut during loading continues after setup", async ({
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
  await choose(page, "Mari check-in");
  await choose(page, "Tulis catatan");
  await choose(page, "Tulis catatan");
  await blocker.evaluate(() => window.dispatchEvent(new Event("release-db")));
  await expect(page.locator("#onboarding")).toBeFocused();
  await onboard(page);
  await expect(page.locator("#journal")).toBeFocused();
  await blocker.close();
});
