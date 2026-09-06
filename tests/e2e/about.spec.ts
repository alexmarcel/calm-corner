import { test, expect, type Page } from "@playwright/test";

async function openAbout(page: Page) {
  const menu = page.getByRole("button", { name: "Menu navigasi" });
  if (await menu.isVisible()) await menu.click();
  const nav = page.getByRole("navigation", { name: "Navigasi utama" });
  await expect(nav.locator("a, button")).toHaveText([
    "Ruang saya",
    "Aktiviti tenang",
    "Catatan & sejarah",
    "Tentang Kami",
  ]);
  await nav.getByRole("button", { name: "Tentang Kami" }).click();
  return page.getByRole("dialog", { name: "Tentang Calm Corner" });
}

test("About is available before and after onboarding, with accessible focus and local content", async ({
  page,
}) => {
  await page.goto("/");
  const dialog = await openAbout(page);
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("Rabia binti Pisa", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Penasihat Kumpulan" }),
  ).toBeVisible();
  await expect(dialog.getByRole("listitem")).toHaveText([
    "DMDDaisy Marcella Durine",
    "DADarmisa Abdullah",
    "FMFarizah binti Mustafa",
    "JFJeccy Fred",
    "MJMasyitah binti Jefri",
  ]);
  const close = dialog.getByRole("button", { name: "Tutup" });
  await expect(close).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(close).toBeFocused();
  const menu = page.getByRole("button", { name: "Menu navigasi" });
  if (await menu.isVisible()) {
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".install-banner")).toHaveAttribute("inert", "");
  }
  await dialog
    .getByText("Masyitah binti Jefri", { exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    dialog.getByText("Masyitah binti Jefri", { exact: true }),
  ).toBeInViewport();
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    (await menu.isVisible())
      ? menu
      : page.getByRole("button", { name: "Tentang Kami" }),
  ).toBeFocused();
  await page.getByLabel("Saya berumur 18 tahun atau lebih.").check();
  await page
    .getByLabel("Saya faham cara data disimpan pada peranti ini.")
    .check();
  await page.getByRole("button", { name: "Mulakan ruang saya" }).click();
  await openAbout(page);
  await expect(dialog).toBeVisible();
  await close.click();
  await expect(dialog).not.toBeVisible();
});
