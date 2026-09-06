// Independent reproduction: no Calm Corner or Workbox code is loaded.
import { webkit } from "@playwright/test";
import { createServer } from "node:http";
const worker = `self.addEventListener('install',e=>e.waitUntil(caches.open('probe').then(c=>c.put('/',new Response('<h1>Cached page</h1>',{headers:{'Content-Type':'text/html'}})))));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>e.respondWith(caches.open('probe').then(c=>c.match('/'))));`;
const server = createServer((req, res) => {
  res.setHeader(
    "Content-Type",
    req.url === "/sw.js" ? "application/javascript" : "text/html",
  );
  res.end(req.url === "/sw.js" ? worker : "<h1>Online page</h1>");
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await webkit.launch();
try {
  console.log(`WebKit ${browser.version()}, ${process.platform}`);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.reload();
  console.log(
    "Online controlled reload:",
    await page.locator("h1").textContent(),
  );
  console.log(
    "Online Blob read:",
    await page.evaluate(() => new Blob(["probe"]).text()),
  );
  await context.setOffline(true);
  console.log(
    "Offline Blob read:",
    await page.evaluate(async () => {
      try {
        return await new Blob(["probe"]).text();
      } catch (error) {
        return `${error.name}: ${error.message}`;
      }
    }),
  );
  try {
    await page.reload();
    console.log(
      "Offline emulation reload:",
      await page.locator("h1").textContent(),
    );
  } catch (error) {
    console.error("Offline emulation failed:", error.message);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
