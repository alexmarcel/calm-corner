import { test, expect } from "@playwright/test";
test("contacts can be added, edited and deleted offline without duplicate submissions", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "This acceptance check targets Chromium offline reloads.",
  );
  await page.goto("/");
  await page.getByLabel("Saya berumur 18 tahun atau lebih.").check();
  await page
    .getByLabel("Saya faham cara data disimpan pada peranti ini.")
    .check();
  await page.getByRole("button", { name: "Mulakan ruang saya" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Sedia luar talian" }),
  ).toBeVisible({ timeout: 60000 });
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("button", { name: "Tambah kontak", exact: true })
    .click();
  await page
    .getByLabel("Nama kontak", { exact: true })
    .fill("Kontak luar talian");
  await page.getByLabel("Nombor telefon", { exact: true }).fill("0123456789");
  await page.locator("#contacts form").evaluate((el) => {
    (el as HTMLFormElement).requestSubmit();
    (el as HTMLFormElement).requestSubmit();
  });
  await expect(page.locator(".trusted-contacts > li")).toHaveCount(1);
  await page.reload();
  await page.locator("[data-edit]").click();
  await page.getByLabel("Hubungan (pilihan)", { exact: true }).fill("Keluarga");
  await page.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(page.locator(".trusted-contacts")).toContainText("Keluarga");
  await page
    .getByRole("button", {
      name: "Padam kontak Kontak luar talian",
      exact: true,
    })
    .click();
  await page
    .locator(".contact-confirm")
    .getByRole("button", { name: "Padam", exact: true })
    .click();
  await expect(page.locator(".trusted-contacts > li")).toHaveCount(0);
});
