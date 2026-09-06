import { test, expect } from "@playwright/test";

test.describe("mobile installation", () => {
  test.use({
    userAgent:
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36",
    viewport: { width: 390, height: 844 },
  });
  test("persistent guide, modal focus, spacing and SOS", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByRole("complementary", {
      name: "Pasang Calm Corner",
    });
    await expect(banner).toBeVisible();
    await banner
      .getByRole("button", { name: "Cara memasang", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText("Chrome");
    await expect(banner).toHaveAttribute("inert", "");
    await page.getByRole("button", { name: "Tutup", exact: true }).click();
    await expect(
      banner.getByRole("button", { name: "Cara memasang", exact: true }),
    ).toBeFocused();
    await banner.getByRole("button", { name: "Sudah pasang?" }).click();
    await expect(page.getByRole("dialog")).toContainText(
      "ketik ikon Calm Corner",
    );
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "SOS / Bantuan", exact: true })
      .click();
    await expect(banner).toHaveAttribute("inert", "");
    await page.keyboard.press("Escape");
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
    );
    await expect
      .poll(async () => {
        const footer = await page.locator("footer").boundingBox();
        const box = await banner.boundingBox();
        return footer!.y + footer!.height - box!.y;
      })
      .toBeLessThanOrEqual(0);
    await page.reload();
    await expect(banner).toBeVisible();
  });
  for (const outcome of ["accepted", "dismissed", "error"]) {
    test(`native prompt ${outcome}`, async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("complementary")).toBeVisible();
      await page.evaluate((outcome) => {
        const e = new Event("beforeinstallprompt", { cancelable: true });
        Object.assign(e, {
          prompt: async () => {
            document.documentElement.dataset.prompts = String(
              Number(document.documentElement.dataset.prompts || 0) + 1,
            );
            if (outcome === "error") throw Error("failed");
          },
          userChoice: Promise.resolve({ outcome }),
        });
        window.dispatchEvent(e);
      }, outcome);
      await page
        .getByRole("button", { name: "Pasang aplikasi", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Cara memasang", exact: true }),
      ).toBeVisible();
      expect(await page.locator("html").getAttribute("data-prompts")).toBe("1");
      if (outcome === "error")
        await expect(page.getByRole("complementary")).toContainText(
          "tidak dapat dimulakan",
        );
      if (outcome === "accepted") {
        await page.evaluate(() =>
          window.dispatchEvent(new Event("appinstalled")),
        );
        await expect(
          page.getByRole("button", {
            name: "Buka dari skrin utama",
            exact: true,
          }),
        ).toBeVisible();
      }
    });
  }
  test("pending prompt prevents repeated requests and display mode hides banner", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      const mode = new EventTarget();
      Object.assign(mode, { matches: false });
      window.matchMedia = (query) =>
        query === "(display-mode: standalone)"
          ? (mode as MediaQueryList)
          : original(query);
      window.addEventListener("test-standalone", () => {
        Object.assign(mode, { matches: true });
        mode.dispatchEvent(new Event("change"));
      });
    });
    await page.goto("/");
    await expect(page.getByRole("complementary")).toBeVisible();
    await page.evaluate(() => {
      const event = new Event("beforeinstallprompt", { cancelable: true });
      Object.assign(event, {
        prompt: async () => {
          document.documentElement.dataset.prompts = String(
            Number(document.documentElement.dataset.prompts || 0) + 1,
          );
        },
        userChoice: new Promise(() => {}),
      });
      window.dispatchEvent(event);
    });
    await page
      .getByRole("button", { name: "Pasang aplikasi", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Sedang memasang…" }),
    ).toBeDisabled();
    expect(await page.locator("html").getAttribute("data-prompts")).toBe("1");
    await page.evaluate(() =>
      window.dispatchEvent(new Event("test-standalone")),
    );
    await expect(page.getByRole("complementary")).toHaveCount(0);
  });
});
test.describe("Apple installation", () => {
  test.use({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1",
  });
  test("Safari instructions and standalone hiding", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Cara memasang", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText("Open as Web App");
    await page.keyboard.press("Escape");
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "standalone", { value: true }),
    );
    await page.reload();
    await expect(
      page.getByRole("complementary", { name: "Pasang Calm Corner" }),
    ).toHaveCount(0);
  });
  test("desktop-style iPad identification", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 Macintosh",
      });
      Object.defineProperty(navigator, "platform", { value: "MacIntel" });
      Object.defineProperty(navigator, "maxTouchPoints", { value: 5 });
    });
    await page.goto("/");
    await expect(
      page.getByRole("complementary", { name: "Pasang Calm Corner" }),
    ).toBeVisible();
  });
});
