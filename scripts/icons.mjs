import fs from "node:fs";
import { PNG } from "pngjs";
for (const [size, name] of [
  [180, "apple-touch-icon"],
  [192, "icon-192"],
  [512, "icon-512"],
  [512, "icon-maskable-512"],
]) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const nx = x / size,
        ny = y / size;
      let color = [18, 63, 72];
      const left = ((nx - 0.4) / 0.11) ** 2 + ((ny - 0.53) / 0.22) ** 2;
      const right = ((nx - 0.58) / 0.115) ** 2 + ((ny - 0.46) / 0.26) ** 2;
      if (left < 1 && nx < 0.51) color = [169, 214, 187];
      if (right < 1 && nx > 0.49) color = [229, 237, 188];
      if (
        Math.abs(nx - (0.51 + 0.2 * (0.7 - ny))) < 0.006 &&
        ny > 0.3 &&
        ny < 0.73
      )
        color = [18, 63, 72];
      const i = (y * size + x) * 4;
      png.data[i] = color[0];
      png.data[i + 1] = color[1];
      png.data[i + 2] = color[2];
      png.data[i + 3] = 255;
    }
  fs.writeFileSync(`public/icons/${name}.png`, PNG.sync.write(png));
}
