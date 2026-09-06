import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function onboard(page: Page) {
  await page.goto("/");
  await page.getByLabel("Saya berumur 18 tahun atau lebih.").check();
  await page
    .getByLabel("Saya faham cara data disimpan pada peranti ini.")
    .check();
  await page.getByRole("button", { name: "Mulakan ruang saya" }).click();
  await expect(
    page.getByRole("button", { name: "Simpan check-in" }),
  ).toBeVisible();
}
async function ready(page: Page) {
  await expect(
    page.getByRole("status").filter({ hasText: "Sedia luar talian" }),
  ).toBeVisible({ timeout: 45000 });
}
test("cold offline restart, check-in, diary CRUD and all audio", async ({
  page,
  context,
}) => {
  await onboard(page);
  await ready(page);
  await context.setOffline(true);
  await page.reload();
  await ready(page);
  await page.getByRole("button", { name: "😌 Tenang", exact: true }).click();
  await page.getByRole("button", { name: "Tidak", exact: true }).click();
  await page
    .getByRole("button", { name: "Ya, saya selamat", exact: true })
    .click();
  await page.getByRole("button", { name: "Simpan check-in" }).click();
  await expect(
    page.getByRole("heading", { name: "Ringkasan hari ini" }),
  ).toBeVisible();
  await page.getByLabel("Catatan jurnal").fill("Catatan ujian luar talian");
  await expect(
    page.getByText("Draf disimpan pada peranti", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Catatan jurnal")).toHaveValue(
    "Catatan ujian luar talian",
  );
  await page
    .getByRole("button", { name: "Simpan catatan", exact: true })
    .click();
  await expect(
    page.getByText("Catatan disimpan", { exact: true }),
  ).toBeVisible();
  await page.locator(".journal-history summary").click();
  await page.getByRole("button", { name: "Buka & edit" }).click();
  await page.getByLabel("Catatan jurnal").fill("Catatan dikemas kini");
  await page
    .getByRole("button", { name: "Simpan catatan", exact: true })
    .click();
  await expect(page.locator(".journal-history article")).toContainText(
    "Catatan dikemas kini",
  );
  for (const sound of ["Hujan", "Ombak", "Hutan", "Kafe", "Piano"]) {
    await page.locator(".sound-tile").filter({ hasText: sound }).click();
    await page.getByRole("button", { name: "Main audio", exact: true }).click();
    await expect
      .poll(() =>
        page
          .locator("audio")
          .first()
          .evaluate((a: HTMLAudioElement) => !a.paused && a.currentTime > 0),
      )
      .toBe(true);
    await page.getByRole("button", { name: "Hentikan audio" }).click();
  }
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Padam catatan/ }).click();
  await expect(page.locator(".journal-history")).toHaveCount(0);
  await page
    .getByRole("button", { name: "SOS / Bantuan", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: /Hubungi 999 sekarang/ }),
  ).toHaveAttribute("href", "tel:999");
  await expect(page.getByRole("link", { name: /Talian HEAL/ })).toHaveAttribute(
    "href",
    "tel:15555",
  );
});
test("unsafe opens SOS immediately and stops audio; grounding is not text-classified", async ({
  page,
}) => {
  await onboard(page);
  await ready(page);
  await page.getByRole("button", { name: "Main audio", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator("audio")
        .first()
        .evaluate((a: HTMLAudioElement) => a.paused),
    )
    .toBe(false);
  await page
    .getByRole("button", { name: "Saya tidak selamat", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("audio")
        .first()
        .evaluate((a: HTMLAudioElement) => a.paused),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Tutup", exact: true }).click();
  await page.getByRole("button", { name: "Grounding", exact: true }).click();
  await page
    .locator(".grounding")
    .getByRole("button", { name: "Ya, saya selamat", exact: true })
    .click();
  await page.getByRole("button", { name: "Mula grounding" }).click();
  await page
    .getByLabel("Sebutkan 5 perkara yang anda boleh lihat.")
    .fill("Telefon, meja, pisau, kerusi, tingkap");
  await page.getByRole("button", { name: "Seterusnya" }).click();
  await expect(
    page.getByLabel("Sebutkan 4 perkara yang anda boleh sentuh."),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("backup export, invalid import and restore work offline", async ({
  page,
  context,
}) => {
  await onboard(page);
  await ready(page);
  await context.setOffline(true);
  await page.getByLabel("Catatan jurnal").fill("Untuk sandaran");
  await page
    .getByRole("button", { name: "Simpan catatan", exact: true })
    .click();
  await page.getByRole("button", { name: "Privasi & storan" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Eksport sandaran", exact: true })
    .click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();
  await page.getByLabel("Pulihkan sandaran JSON").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole("alert")).toContainText("Fail tidak sah");
  await page.getByLabel("Pulihkan sandaran JSON").setInputFiles(backupPath!);
  await expect(
    page.getByText("Gantikan data pada peranti ini?", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ya, gantikan & pulihkan" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator(".journal-history summary").click();
  await expect(page.locator(".journal-history article")).toContainText(
    "Untuk sandaran",
  );
});
test("keyboard, responsive layout and accessibility", async ({
  page,
}, testInfo) => {
  await onboard(page);
  await ready(page);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-dashboard.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "SOS / Bantuan", exact: true })
    .click();
  await page.keyboard.press("Tab");
  await expect
    .poll(() =>
      page.evaluate(() => !!document.activeElement?.closest("dialog")),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
