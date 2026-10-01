/**
 * Remove near-black background from the lotus source image, then regenerate
 * Tauri platform icons via `tauri icon`.
 *
 * Usage: node scripts/generate-app-icons.mjs [source-image-path]
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const iconsDir = path.join(root, "src-tauri", "icons");
const publicDir = path.join(root, "public");

const defaultSource = path.join(iconsDir, "icon-source-raw.jpg");
const sourcePath = path.resolve(root, process.argv[2] ?? defaultSource);
const processedPath = path.join(iconsDir, "icon-source.png");

const BLACK_THRESHOLD = 20;
const FEATHER = 50;

async function removeBlackBackground(input, output) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const peak = Math.max(r, g, b);

    if (peak <= BLACK_THRESHOLD) {
      data[i + 3] = 0;
    } else if (peak < BLACK_THRESHOLD + FEATHER) {
      const t = (peak - BLACK_THRESHOLD) / FEATHER;
      data[i + 3] = Math.round(t * 255);
    } else {
      data[i + 3] = 255;
    }
  }

  const transparent = await sharp(data, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  await sharp(transparent)
    .trim({ threshold: 1 })
    .resize(1024, 1024, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(output);
}

function runTauriIcon() {
  execSync(
    `npx tauri icon "${processedPath}" -o "${iconsDir}" --ios-color "#0a0a0a"`,
    { cwd: root, stdio: "inherit" },
  );
}

async function copyPublicAssets() {
  await sharp(processedPath).resize(256, 256).png().toFile(path.join(publicDir, "app-logo.png"));
  await sharp(processedPath).resize(128, 128).png().toFile(path.join(publicDir, "favicon.png"));
}

async function main() {
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source image not found: ${sourcePath}`);
    process.exit(1);
  }

  console.log(`Processing: ${sourcePath}`);
  await removeBlackBackground(sourcePath, processedPath);
  console.log(`Saved transparent source: ${processedPath}`);

  console.log("Generating platform icons...");
  runTauriIcon();

  console.log("Copying public web assets...");
  await copyPublicAssets();

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
