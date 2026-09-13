import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const resourceRoot = path.resolve("android/app/src/main/res");
const mark = await fs.readFile(path.resolve("public/tinkertown-mark.svg"));

const launcherSizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

for (const [density, size] of Object.entries(launcherSizes)) {
  const directory = path.join(resourceRoot, `mipmap-${density}`);
  const inset = Math.round(size * 0.18);
  const icon = await sharp({
    create: { width: size, height: size, channels: 4, background: "#FFE600" },
  })
    .composite([{ input: await sharp(mark).resize(size - inset * 2).png().toBuffer(), gravity: "centre" }])
    .png()
    .toBuffer();
  await fs.writeFile(path.join(directory, "ic_launcher.png"), icon);
  await fs.writeFile(path.join(directory, "ic_launcher_round.png"), icon);

  const foregroundSize = Math.round(size * 2.25);
  const foregroundMark = await sharp(mark).resize(Math.round(foregroundSize * 0.48)).png().toBuffer();
  await sharp({
    create: { width: foregroundSize, height: foregroundSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: foregroundMark, gravity: "centre" }])
    .png()
    .toFile(path.join(directory, "ic_launcher_foreground.png"));
}

const entries = await fs.readdir(resourceRoot, { recursive: true });
for (const entry of entries.filter((item) => item.endsWith("splash.png"))) {
  const file = path.join(resourceRoot, entry);
  const { width, height } = await sharp(file).metadata();
  if (!width || !height) continue;
  const markSize = Math.round(Math.min(width, height) * 0.24);
  const splashMark = await sharp(mark).resize(markSize).png().toBuffer();
  await sharp({ create: { width, height, channels: 4, background: "#FFFFFF" } })
    .composite([{ input: splashMark, gravity: "centre" }])
    .png()
    .toFile(`${file}.next`);
  await fs.rename(`${file}.next`, file);
}
