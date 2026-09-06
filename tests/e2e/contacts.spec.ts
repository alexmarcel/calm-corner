import { test, expect, type Page } from "@playwright/test";
test.use({ reducedMotion: "reduce" });
async function setup(page: Page) {
  await page.getByLabel("Saya berumur 18 tahun atau lebih.").check();
  await page
    .getByLabel("Saya faham cara data disimpan pada peranti ini.")
    .check();
  await page.getByRole("button", { name: "Mulakan ruang saya" }).click();
}
async function manage(page: Page) {
  await page.locator("footer button").click();
  await page
    .getByRole("button", { name: "Urus orang yang dipercayai" })
    .click();
}
async function add(page: Page, name = "Aina") {
  await page
    .getByRole("button", { name: "Tambah kontak", exact: true })
    .click();
  await expect(page.getByLabel("Nama kontak", { exact: true })).toBeFocused();
  await page.getByLabel("Nama kontak", { exact: true }).fill(name);
  await page.getByLabel("Hubungan (pilihan)", { exact: true }).fill("Kawan");
  await page.getByLabel("Nombor telefon", { exact: true }).fill("+60123456789");
  await page
    .getByRole("button", { name: "Simpan kontak", exact: true })
    .click();
}
test("Settings navigation, CRUD, focus, SOS and reload persistence", async ({
  page,
}) => {
  await page.goto("/");
  await manage(page);
  await expect(page.locator("#onboarding")).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await setup(page);
  await expect(page.locator("#contacts")).toBeFocused();
  await expect(page.locator(".diary-column > section")).toHaveCount(2);
  await expect(page.locator(".diary-column > section").nth(0)).toHaveAttribute(
    "id",
    "diary",
  );
  await expect(page.locator(".diary-column > section").nth(1)).toHaveAttribute(
    "id",
    "contacts",
  );
  await add(page);
  await expect(
    page.getByRole("button", { name: "Edit kontak Aina", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Edit kontak Aina", exact: true })
    .click();
  await page.getByLabel("Nama kontak", { exact: true }).fill("Aina Baru");
  await page.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(
    page.getByRole("button", { name: "Edit kontak Aina Baru", exact: true }),
  ).toBeFocused();
  await page.locator(".sos-button").click();
  await expect(
    page.getByRole("dialog").getByText("Aina Baru", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await manage(page);
  await expect(page.locator("#contacts")).toBeFocused();
  await page
    .getByRole("button", { name: "Padam kontak Aina Baru", exact: true })
    .click();
  await page
    .locator(".contact-confirm")
    .getByRole("button", { name: "Batal" })
    .click();
  await expect(
    page.getByRole("button", { name: "Edit kontak Aina Baru", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Padam kontak Aina Baru", exact: true })
    .click();
  await page
    .locator(".contact-confirm")
    .getByRole("button", { name: "Padam", exact: true })
    .click();
  await expect(page.locator(".trusted-contacts > li")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Tambah kontak", exact: true }),
  ).toBeFocused();
});
test("discard confirmation, validation and storage failure preserve form", async ({
  page,
}) => {
  await page.goto("/");
  await setup(page);
  await add(page);
  await page
    .getByRole("button", { name: "Edit kontak Aina", exact: true })
    .click();
  await page.getByLabel("Nama kontak", { exact: true }).fill("Unsaved");
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Tambah kontak", exact: true })
    .click();
  await expect(page.getByLabel("Nama kontak", { exact: true })).toHaveValue(
    "Unsaved",
  );
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Tambah kontak", exact: true })
    .click();
  await page.getByLabel("Nama kontak", { exact: true }).fill("Siti");
  await page.getByLabel("Nombor telefon", { exact: true }).fill("abc");
  await page
    .getByRole("button", { name: "Simpan kontak", exact: true })
    .click();
  await expect(page.locator(".trusted-contacts > li")).toHaveCount(1);
  await page.getByLabel("Nombor telefon", { exact: true }).fill("0123456789");
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === "trustedContacts")
        throw new DOMException("Test failure", "QuotaExceededError");
      return original.apply(this, args);
    };
    window.addEventListener(
      "restore-contact-storage",
      () => {
        IDBObjectStore.prototype.put = original;
      },
      { once: true },
    );
  });
  await page
    .getByRole("button", { name: "Simpan kontak", exact: true })
    .click();
  await expect(page.locator("#contacts").getByRole("alert")).toContainText(
    "Maklumat anda dikekalkan",
  );
  await expect(page.getByLabel("Nama kontak", { exact: true })).toHaveValue(
    "Siti",
  );
  await page.evaluate(() =>
    window.dispatchEvent(new Event("restore-contact-storage")),
  );
  await page
    .getByRole("button", { name: "Simpan kontak", exact: true })
    .click();
  await expect(page.locator(".trusted-contacts > li")).toHaveCount(2);
});

test("capacity keeps editing available and long names fit on phones", async ({
  page,
}) => {
  await page.goto("/");
  await setup(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("calm-corner");
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("trustedContacts", "readwrite");
          for (let i = 0; i < 20; i++)
            tx.objectStore("trustedContacts").put({
              id: crypto.randomUUID(),
              name: i === 0 ? "A".repeat(80) : `Kontak ${i}`,
              relationship: "Kawan",
              phone: "+60123456789",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      }),
  );
  await page.reload();
  await manage(page);
  await expect(
    page.getByRole("button", { name: "Tambah kontak", exact: true }),
  ).toBeDisabled();
  await page.locator("[data-edit]").first().click();
  await page.getByLabel("Nama kontak", { exact: true }).fill("Nama baharu");
  await page.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(page.locator(".trusted-contacts > li")).toHaveCount(20);
  await page.setViewportSize({ width: 360, height: 640 });
  expect(
    await page
      .locator("#contacts")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page
    .locator(".trusted-contacts > li")
    .first()
    .getByRole("button", { name: /^Padam kontak/ })
    .click();
  await page
    .locator(".contact-confirm")
    .getByRole("button", { name: "Padam", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tambah kontak", exact: true }),
  ).toBeEnabled();
});

test("Settings contact request waits for loading and continues after onboarding", async ({
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
  await manage(page);
  await manage(page);
  await blocker.evaluate(() => window.dispatchEvent(new Event("release-db")));
  await expect(page.locator("#onboarding")).toBeFocused();
  await setup(page);
  await expect(page.locator("#contacts")).toBeFocused();
  await blocker.close();
});
