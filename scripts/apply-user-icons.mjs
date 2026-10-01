/**
 * Apply a user-provided icon set (32, 128, icon/master) into src-tauri/icons.
 *
 * Usage:
 *   node scripts/apply-user-icons.mjs [dir-with-32x32.png-128x128.png-icon.png]
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

const inputDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(
      process.env.USERPROFILE ?? "",
      ".cursor/projects/g-ATom-Khuong-LotusDharma-Project-App-BuddaInHere/assets",
    );

const files = {
  small: findFile(inputDir, "32x32"),
  medium: findFile(inputDir, "128x128"),
  master: findFile(inputDir, "icon"),
};

function findFile(dir, prefix) {
  if (!fs.existsSync(dir)) return null;
  return fs
    .readdirSync(dir)
    .map((name) => path.join(dir, name))
    .find((filePath) => {
      const base = path.basename(filePath).toLowerCase();
      return base.includes(prefix) && /\.(png|jpe?g|webp)$/i.test(base);
    });
}

async function removeBlackBackground(input, output, size) {
  const { data, info } = await sharp(input)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const threshold = 20;
  const feather = 50;

  for (let i = 0; i < data.length; i += channels) {
    const peak = Math.max(data[i], data[i + 1], data[i + 2]);
    if (peak <= threshold) {
      data[i + 3] = 0;
    } else if (peak < threshold + feather) {
      data[i + 3] = Math.round(((peak - threshold) / feather) * 255);
    } else {
      data[i + 3] = 255;
    }
  }

  await sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(output);
}

async function copyExact(source, target) {
  await fs.promises.copyFile(source, target);
}

async function main() {
  for (const [key, filePath] of Object.entries(files)) {
    if (!filePath) {
      console.error(`Missing ${key} icon in ${inputDir}`);
      process.exit(1);
    }
  }

  console.log("Applying user icons:");
  console.log(`  32x32   -> ${files.small}`);
  console.log(`  128x128 -> ${files.medium}`);
  console.log(`  master  -> ${files.master}`);

  await copyExact(files.small, path.join(iconsDir, "32x32.png"));
  await copyExact(files.medium, path.join(iconsDir, "128x128.png"));

  const masterMeta = await sharp(files.master).metadata();
  if (masterMeta.hasAlpha) {
    await sharp(files.master).png().toFile(path.join(iconsDir, "icon.png"));
    await sharp(files.master).png().toFile(path.join(iconsDir, "128x128@2x.png"));
    await sharp(files.master)
      .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(iconsDir, "icon-source.png"));
  } else {
    await removeBlackBackground(files.master, path.join(iconsDir, "icon.png"), 256);
    await removeBlackBackground(files.master, path.join(iconsDir, "128x128@2x.png"), 256);
    await removeBlackBackground(files.master, path.join(iconsDir, "icon-source.png"), 1024);
  }

  await sharp(files.medium).resize(64, 64).png().toFile(path.join(iconsDir, "64x64.png"));

  console.log("Generating platform bundle icons...");
  execSync(`npx tauri icon "${path.join(iconsDir, "icon-source.png")}" -o "${iconsDir}" --ios-color "#0a0a0a"`, {
    cwd: root,
    stdio: "inherit",
  });

  // Keep the exact user-provided tray sizes.
  await copyExact(files.small, path.join(iconsDir, "32x32.png"));
  await copyExact(files.medium, path.join(iconsDir, "128x128.png"));

  await sharp(files.medium).resize(128, 128).png().toFile(path.join(publicDir, "favicon.png"));
  await sharp(files.medium).resize(256, 256).png().toFile(path.join(publicDir, "app-logo.png"));

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
