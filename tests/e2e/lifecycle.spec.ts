import { test, expect } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
let server: Server;
let origin: string;
let failAudio = false;
let version = 1;
let brokenWorker = false;
let disconnected = false;
test.beforeEach(async () => {
  failAudio = false;
  version = 1;
  brokenWorker = false;
  disconnected = false;
  const root = resolve("dist");
  server = createServer(async (req, res) => {
    if (disconnected) {
      req.socket.destroy();
      return;
    }
    const path = new URL(req.url || "/", "http://localhost").pathname;
    const file = resolve(root, "." + (path === "/" ? "/index.html" : path));
    if (!file.startsWith(root + "\\") && !file.startsWith(root + "/")) {
      res.writeHead(403).end();
      return;
    }
    if (failAudio && path === "/audio/piano.mp3") {
      res.writeHead(503).end();
      return;
    }
    try {
      let body = await readFile(file);
      if (path === "/sw.js")
        body = Buffer.concat([
          body,
          Buffer.from(
            `\n// test release ${version}\n${brokenWorker ? 'throw new Error("broken release");' : ""}`,
          ),
        ]);
      const mime: Record<string, string> = {
        ".js": "application/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
        ".woff": "font/woff",
        ".webmanifest": "application/manifest+json",
        ".png": "image/png",
        ".json": "application/json",
      };
      res
        .writeHead(200, {
          "Content-Type": mime[extname(file)] || "text/plain",
          "Cache-Control": "no-store",
        })
        .end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  origin = `http://127.0.0.1:${address.port}`;
});
test.afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r())));
});
async function start(page: import("@playwright/test").Page) {
  await page.goto(origin);
  await page.getByLabel("Saya berumur 18 tahun atau lebih.").check();
  await page
    .getByLabel("Saya faham cara data disimpan pada peranti ini.")
    .check();
  await page.getByRole("button", { name: "Mulakan ruang saya" }).click();
}
test("fresh page loads cached app and audio when origin disconnects", async ({
  page,
  context,
}) => {
  await start(page);
  await expect(
    page.getByRole("status").filter({ hasText: "Sedia luar talian" }),
  ).toBeVisible();
  await page.getByLabel("Catatan jurnal").fill("Draf sebelum pelayan terputus");
  await expect(page.getByText("Draf disimpan", { exact: false })).toBeVisible();
  disconnected = true;
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(origin);
  await expect(reopened.getByLabel("Catatan jurnal")).toHaveValue(
    "Draf sebelum pelayan terputus",
  );
  await expect(
    reopened.getByRole("status").filter({ hasText: "Sedia luar talian" }),
  ).toBeVisible();
  for (const track of ["rain", "ocean", "forest", "cafe", "piano"]) {
    expect(
      await reopened.evaluate(async (track) => {
        const response = await fetch(`/audio/${track}.mp3`);
        return response.ok && (await response.arrayBuffer()).byteLength > 0;
      }, track),
    ).toBe(true);
  }
  await reopened.getByRole("button", { name: "Privasi & storan" }).click();
  const downloaded = reopened.waitForEvent("download");
  await reopened
    .getByRole("button", { name: "Eksport sandaran", exact: true })
    .click();
  const backup = await downloaded;
  await reopened
    .getByLabel("Pulihkan sandaran JSON")
    .setInputFiles((await backup.path())!);
  await expect(
    reopened.getByText("Gantikan data pada peranti ini?", { exact: true }),
  ).toBeVisible();
  await reopened
    .getByRole("button", { name: "Ya, gantikan & pulihkan" })
    .click();
  await expect(reopened.getByRole("dialog")).toHaveCount(0);
  await expect(reopened.getByLabel("Catatan jurnal")).toHaveValue(
    "Draf sebelum pelayan terputus",
  );
});
test("interrupted asset download never claims readiness and can retry", async ({
  page,
}) => {
  failAudio = true;
  await start(page);
  await expect(
    page.getByRole("status").filter({ hasText: /gagal|terganggu/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Sedia luar talian" }),
  ).toHaveCount(0);
  failAudio = false;
  await page.getByRole("button", { name: "Cuba lagi", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Sedia luar talian" }),
  ).toBeVisible();
});
test("accepted worker update preserves draft and history across offline restart", async ({
  page,
  context,
}) => {
  await start(page);
  await expect(
    page.getByRole("status").filter({ hasText: "Sedia luar talian" }),
  ).toBeVisible();
  await page.getByLabel("Catatan jurnal").fill("Saved history survives update");
  await page
    .getByRole("button", { name: "Simpan catatan", exact: true })
    .click();
  await expect(
    page.getByText("Catatan disimpan", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Catatan jurnal")
    .fill("Keep this draft through update");
  await expect(
    page.getByText("Draf disimpan pada peranti", { exact: true }),
  ).toBeVisible();
  version = 2;
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.getRegistration())?.update();
  });
  await expect(
    page.getByRole("button", { name: "Kemas kini sekarang" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kemas kini sekarang" }).click();
  await expect(page.getByLabel("Catatan jurnal")).toHaveValue(
    "Keep this draft through update",
  );
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel("Catatan jurnal")).toHaveValue(
    "Keep this draft through update",
  );
  await page.locator(".journal-history summary").click();
  await expect(page.locator(".journal-history article")).toContainText(
    "Saved history survives update",
  );
});
test("failed update leaves previous app usable offline", async ({
  page,
  context,
}) => {
  await start(page);
  await expect(
    page.getByRole("status").filter({ hasText: "Sedia luar talian" }),
  ).toBeVisible();
  brokenWorker = true;
  version = 3;
  const failed = await page.evaluate(async () => {
    try {
      await (await navigator.serviceWorker.getRegistration())?.update();
      return false;
    } catch {
      return true;
    }
  });
  expect(failed).toBe(true);
  await expect(
    page.getByRole("button", { name: "Kemas kini sekarang" }),
  ).toHaveCount(0);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("status").filter({ hasText: "Sedia luar talian" }),
  ).toBeVisible();
  await expect(page.getByLabel("Catatan jurnal")).toBeVisible();
});
test("missing cached audio is detected offline and repaired on retry", async ({
  page,
  context,
}) => {
  await start(page);
  await expect(
    page.getByRole("status").filter({ hasText: "Sedia luar talian" }),
  ).toBeVisible();
  await page.evaluate(async () => {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys())
        if (request.url.includes("/audio/piano.mp3"))
          await cache.delete(request);
    }
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("status").filter({ hasText: "Muat turun belum lengkap" }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("button", { name: "Cuba lagi", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Sedia luar talian" }),
  ).toBeVisible();
});
test("failed diary writes preserve text and allow exporting the unsaved draft", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<IDBObjectStore["put"]>
    ) {
      if (this.name === "journalDrafts" || this.name === "journalEntries")
        throw new DOMException("full", "QuotaExceededError");
      return put.apply(this, args);
    };
  });
  await page
    .getByLabel("Catatan jurnal")
    .fill("Do not lose this unsaved draft");
  await expect(page.getByRole("alert")).toContainText("Draf belum disimpan");
  await page
    .getByRole("button", { name: "Simpan catatan", exact: true })
    .click();
  await expect(page.getByLabel("Catatan jurnal")).toHaveValue(
    "Do not lose this unsaved draft",
  );
  await page.getByRole("button", { name: "Privasi & storan" }).click();
  const exported = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Eksport sandaran", exact: true })
    .click();
  const download = await exported;
  const raw = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(raw.journalDrafts[0].body).toBe("Do not lose this unsaved draft");
});
test("unavailable IndexedDB keeps SOS and calming tools accessible", async ({
  page,
}) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = function () {
      throw new DOMException("Storage disabled", "SecurityError");
    };
  });
  await page.goto(origin);
  await expect(page.getByRole("alert")).toContainText(
    "Storan peranti tidak tersedia",
  );
  await page
    .getByRole("button", { name: "SOS / Bantuan", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: /Hubungi 999 sekarang/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tutup", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Breathe with me", exact: true }),
  ).toBeVisible();
});
test("denied persistence is explained; breathing pauses when hidden", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.storage, "persist", {
      value: async () => false,
    });
  });
  await start(page);
  await page.getByRole("button", { name: "Privasi & storan" }).click();
  await page.getByRole("button", { name: "Minta storan berterusan" }).click();
  await expect(
    page.getByText(
      "Pelayar tidak memberi storan berterusan. Eksport sandaran secara berkala.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tutup", exact: true }).click();
  await page
    .getByRole("button", { name: "Breathe with me", exact: true })
    .click();
  await page.getByRole("button", { name: "Mula", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Jeda", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "Jeda", exact: true }),
  ).toHaveCount(0);
});
