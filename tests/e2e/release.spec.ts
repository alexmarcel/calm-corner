import { test, expect } from "@playwright/test";
test("insecure origin explains HTTPS requirement", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "isSecureContext", { value: false }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("status").filter({ hasText: "HTTPS" }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Sedia luar talian" }),
  ).toHaveCount(0);
});
test("release assets have correct response types", async ({ request }) => {
  for (const [path, mime] of [
    ["/sw.js", /javascript/],
    ["/manifest.webmanifest", /manifest\+json/],
    ["/icons/apple-touch-icon.png", /image\/png/],
    ["/audio/rain.mp3", /audio\/mpeg/],
  ]) {
    const response = await request.get(path as string);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toMatch(mime as RegExp);
  }
  for (const path of ["/missing.js", "/audio/missing.mp3"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
  }
});
test("mobile rotation and short viewport keep dialog controls reachable", async ({
  page,
}) => {
  await page.goto("/");
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 390, height: 360 },
  ]) {
    await page.setViewportSize(viewport);
    await page
      .getByRole("button", { name: "SOS / Bantuan", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Tutup", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
