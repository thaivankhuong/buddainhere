/**
 * Parse shared-images-list.txt → src/data/dhammapada-image-map.json
 *
 * Usage:
 *   node scripts/parse-dhammapada-images.mjs [path-to-shared-images-list.txt]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "src/data/dhammapada-image-map.json");

const inputPath =
  process.argv[2] ||
  path.join(
    process.env.USERPROFILE || process.env.HOME || "",
    "Downloads",
    "shared-images-list.txt",
  );

if (!fs.existsSync(inputPath)) {
  console.error(`Không tìm thấy file: ${inputPath}`);
  process.exit(1);
}

const text = fs.readFileSync(inputPath, "utf8");
const shared = {};
const noImage = new Set();

// "004 dùng ảnh của 003 (003.png)"
const shareRe = /^(\d+)\s+dùng ảnh của\s+(\d+)/gim;
let m;
while ((m = shareRe.exec(text)) !== null) {
  shared[String(Number(m[1]))] = Number(m[2]);
}

// "135 (nums=[135]) — ... status=crop_failed"
const noImageRe = /^(\d+)\s+\(nums=\[.*?\]\).*?status=crop_failed/gim;
while ((m = noImageRe.exec(text)) !== null) {
  noImage.add(Number(m[1]));
}

// Fallback known crop_failed if regex misses section header format
if (noImage.size === 0) {
  for (const id of [135, 145]) noImage.add(id);
}

const payload = {
  source: "Tích Truyện Kinh Pháp Cú — shared image aliases",
  shared,
  noImage: Array.from(noImage).sort((a, b) => a - b),
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");

console.log(
  `Wrote ${outPath}: ${Object.keys(shared).length} shared, ${payload.noImage.length} noImage`,
);
