import assert from "node:assert/strict";
import fs from "node:fs";
import { PNG } from "pngjs";
const manifest = JSON.parse(
  fs.readFileSync("dist/manifest.webmanifest", "utf8"),
);
for (const key of ["id", "scope", "start_url"])
  assert.equal(manifest[key], "/");
assert.equal(manifest.display, "standalone");
const inventory = JSON.parse(
  fs.readFileSync("dist/offline-assets.json", "utf8"),
);
const worker = fs.readFileSync("dist/sw.js", "utf8");
for (const icon of manifest.icons) {
  const png = PNG.sync.read(fs.readFileSync(`dist${icon.src}`));
  assert.equal(icon.sizes, `${png.width}x${png.height}`);
  assert(inventory.paths.includes(icon.src));
  assert(worker.includes(icon.src.slice(1)));
  if (icon.purpose === "maskable") {
    // Entire leaf mark must fit in the central circle of radius 40%.
    for (let y = 0; y < png.height; y++)
      for (let x = 0; x < png.width; x++) {
        const i = (y * png.width + x) * 4;
        assert.equal(png.data[i + 3], 255);
        if (
          png.data[i] !== 18 ||
          png.data[i + 1] !== 63 ||
          png.data[i + 2] !== 72
        )
          assert(Math.hypot(x / png.width - 0.5, y / png.height - 0.5) <= 0.4);
      }
  }
}
const apple = PNG.sync.read(fs.readFileSync("dist/icons/apple-touch-icon.png"));
assert.equal(apple.width, 180);
assert.equal(apple.height, 180);
assert(worker.includes("icons/apple-touch-icon.png"));
const html = fs.readFileSync("dist/index.html", "utf8");
assert(html.includes("icons/apple-touch-icon.png"));
assert(html.includes(manifest.theme_color));
for (const path of inventory.paths)
  assert(worker.includes(path.slice(1)), `Not precached: ${path}`);
const config = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
for (const route of ["/", "/index.html", "/sw.js", "/manifest.webmanifest"])
  assert(
    config.headers.some(
      (rule) =>
        rule.source === route &&
        rule.headers.some(
          (h) => h.key === "Cache-Control" && h.value === "no-cache",
        ),
    ),
  );
assert(
  !config.rewrites,
  "Missing asset responses must not be rewritten to HTML",
);
console.log(
  "PWA identity, icon dimensions/safe area, precache coverage and revalidation configuration passed.",
);
