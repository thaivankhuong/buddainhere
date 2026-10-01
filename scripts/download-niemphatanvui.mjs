/**
 * Tải toàn bộ hình Phật chất lượng cao từ niemphatanvui.vn, phân theo bộ sưu tập.
 * Kết quả:
 *   Data/niemphatanvui/{group-slug}/{image-slug}.png       — ảnh gốc
 *   Data/niemphatanvui-app/{group-slug}/{image-slug}.jpg   — bản thu nhỏ đóng gói vào app
 *   Data/niemphatanvui-app/manifest.json
 *
 * Ảnh gốc có thể tới ~900 MB khi giải nén (vượt giới hạn installer NSIS 2 GB và giới hạn
 * decode của crate image), nên app chỉ dùng bản thu nhỏ.
 *
 * Chạy lại được: ảnh đã tải / đã thu nhỏ sẽ được bỏ qua.
 * Chạy: npm run download:niemphatanvui
 */
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = "https://www.niemphatanvui.vn";
const ITEM_BASE = "hinh-phat-chat-luong-cao";
const GROUP_BASE = "bo-suu-tap-hinh-phat-chat-luong-cao";
const OUT_DIR = path.join(__dirname, "..", "Data", "niemphatanvui");
const APP_DIR = path.join(__dirname, "..", "Data", "niemphatanvui-app");
const MANIFEST_PATH = path.join(APP_DIR, "manifest.json");
const APP_MAX_PX = 2560;
const APP_JPEG_QUALITY = 88;
const MANIFEST_VERSION = 1;
const FALLBACK_GROUP = { slug: "khac", name: "Khác" };
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const DELAY_MS = 400;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, options = {}, attempts = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: { "User-Agent": USER_AGENT, ...options.headers },
      });
      if (res.ok) return res;
      if (i >= attempts || (res.status < 500 && res.status !== 429)) {
        throw new Error(`HTTP ${res.status} ${url}`);
      }
    } catch (err) {
      if (i >= attempts) throw err;
    }
    await sleep(1000 * 2 ** i);
  }
}

async function fetchText(url) {
  return (await fetchWithRetry(url)).text();
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? decodeEntities(m[1]) : "";
}

async function listSitemap() {
  const xml = await fetchText(`${SITE}/sitemap.xml`);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const slugsUnder = (base) =>
    locs
      .filter((u) => u.startsWith(`${SITE}/${base}/`))
      .map((u) => u.slice(`${SITE}/${base}/`.length))
      .filter(Boolean);
  return { itemSlugs: slugsUnder(ITEM_BASE), groupSlugs: slugsUnder(GROUP_BASE) };
}

async function readItemPage(slug) {
  const html = await fetchText(`${SITE}/${ITEM_BASE}/${slug}`);
  const seo = html.match(/<[^>]*id="data-seo"[^>]*>/)?.[0] ?? "";
  const server = attr(seo, "data-download-server");
  const downloadSlug = attr(seo, "data-download-slug") || slug;
  const title = attr(seo, "data-name") || slug;

  const collection = html.match(
    /imgherocollection-list[\s\S]*?href="\/bo-suu-tap-hinh-phat-chat-luong-cao\/([^"]+)"[^>]*>([^<]*)<\/a>/,
  );
  const group = collection
    ? { slug: collection[1], name: decodeEntities(collection[2]) }
    : FALLBACK_GROUP;

  return { slug, downloadSlug, server, title, group };
}

async function downloadImage(item, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return { skipped: true, size: fs.statSync(dest).size };

  const url = `https://${item.server}/${item.downloadSlug}.png`;
  const tmp = `${dest}.part`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetchWithRetry(url, {
        headers: { Referer: `${SITE}/${ITEM_BASE}/${item.slug}` },
      });
      await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
      break;
    } catch (err) {
      if (attempt >= 3 || String(err.message).startsWith("HTTP 4")) throw err;
      await sleep(2000 * attempt);
    }
  }
  fs.renameSync(tmp, dest);
  return { skipped: false, size: fs.statSync(dest).size };
}

async function makeAppImage(source, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return;
  const tmp = `${dest}.part`;
  await sharp(source, { limitInputPixels: false })
    .resize(APP_MAX_PX, APP_MAX_PX, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: APP_JPEG_QUALITY, mozjpeg: true })
    .toFile(tmp);
  fs.renameSync(tmp, dest);
}

function formatMB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(APP_DIR, { recursive: true });
  const { itemSlugs, groupSlugs } = await listSitemap();
  console.log(`Sitemap: ${itemSlugs.length} ảnh, ${groupSlugs.length} bộ sưu tập`);

  const groups = new Map();
  for (const slug of groupSlugs) groups.set(slug, { slug, name: slug, images: [] });

  let totalBytes = 0;
  let downloaded = 0;
  let skipped = 0;
  const failures = [];

  for (const [i, slug] of itemSlugs.entries()) {
    const prefix = `[${i + 1}/${itemSlugs.length}] ${slug}`;
    try {
      const item = await readItemPage(slug);
      if (!item.server) throw new Error("không tìm thấy server tải ảnh");

      if (!groups.has(item.group.slug)) groups.set(item.group.slug, { ...item.group, images: [] });
      const group = groups.get(item.group.slug);
      group.name = item.group.name;

      const original = path.join(OUT_DIR, item.group.slug, `${slug}.png`);
      const file = `${item.group.slug}/${slug}.jpg`;
      const appImage = path.join(APP_DIR, file);
      fs.mkdirSync(path.dirname(original), { recursive: true });
      fs.mkdirSync(path.dirname(appImage), { recursive: true });

      const result = await downloadImage(item, original);
      totalBytes += result.size;
      if (result.skipped) skipped++;
      else downloaded++;
      await makeAppImage(original, appImage);
      group.images.push({ slug, file, title: item.title });
      console.log(`${prefix} -> ${item.group.slug}/ (${formatMB(result.size)}${result.skipped ? ", đã có" : ""})`);
    } catch (err) {
      failures.push({ slug, error: String(err.message ?? err) });
      console.error(`${prefix} LỖI: ${err.message ?? err}`);
    }
    await sleep(DELAY_MS);
  }

  const manifestGroups = [...groups.values()]
    .filter((g) => g.images.length > 0)
    .map((g) => ({ ...g, images: g.images.sort((a, b) => a.slug.localeCompare(b.slug)) }));

  const manifest = {
    version: MANIFEST_VERSION,
    source: `${SITE}/${ITEM_BASE}`,
    groups: manifestGroups,
  };
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const imageCount = manifestGroups.reduce((n, g) => n + g.images.length, 0);
  console.log(
    `\nXong: ${imageCount} ảnh trong ${manifestGroups.length} nhóm (tải mới ${downloaded}, bỏ qua ${skipped}), tổng ${formatMB(totalBytes)}`,
  );
  console.log(`Manifest: ${MANIFEST_PATH}`);
  if (failures.length > 0) {
    console.log(`${failures.length} ảnh lỗi:`);
    for (const f of failures) console.log(`  - ${f.slug}: ${f.error}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
