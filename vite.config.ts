import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { build } from "vite";
import { injectManifest } from "workbox-build";
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

export default defineConfig({
  // Navigation is hash-based; missing assets must never fall back to index.html.
  appType: "mpa",
  plugins: [
    react(),
    tailwind(),
    {
      name: "offline-build",
      apply: "build",
      async closeBundle() {
        await build({
          configFile: false,
          publicDir: false,
          define: { "process.env.NODE_ENV": '"production"' },
          build: {
            outDir: "dist",
            emptyOutDir: false,
            lib: {
              entry: "src/sw.ts",
              formats: ["es"],
              fileName: () => "sw.js",
            },
            minify: true,
          },
        });
        await injectManifest({
          swSrc: "dist/sw.js",
          swDest: "dist/sw.js",
          globDirectory: "dist",
          globPatterns: [
            "**/*.{html,js,css,woff2,woff,svg,png,wav,mp3,txt,webmanifest,json}",
          ],
          globIgnores: ["sw.js"],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        });
        const sw = await readFile("dist/sw.js", "utf8");
        const paths: string[] = [];
        let bytes = 0;
        async function walk(dir: string) {
          for (const f of await readdir(dir)) {
            const p = join(dir, f);
            if ((await stat(p)).isDirectory()) await walk(p);
            else {
              bytes += (await stat(p)).size;
              if (f !== "sw.js" && f !== "offline-assets.json")
                paths.push(
                  "/" + p.replaceAll("\\", "/").replace(/^dist\//, ""),
                );
            }
          }
        }
        await walk("dist");
        if (bytes > 25 * 1024 * 1024)
          throw new Error("Offline bundle exceeds 25 MB");
        await writeFile(
          "dist/offline-assets.json",
          JSON.stringify({ paths, bytes, version: sw.length.toString() }),
        );
        console.log(`Offline bundle: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
      },
    },
  ],
});
