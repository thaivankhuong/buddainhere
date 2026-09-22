import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Build src/data/dhammapada.json from BuddhaSasana HT. Minh Châu HTML.
 * Sources: https://budsas.net/uni/u-kinh-tieubo1/tb12-pc{1,2,3}.htm
 *
 * Usage: node scripts/parse-dhammapada.mjs
 * Place pc1.html pc2.html pc3.html in scripts/ first (or re-download).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const CHAPTERS = [
  { id: 1, name: "Song Yếu", paliName: "Yamakavagga", start: 1, end: 20 },
  { id: 2, name: "Không Phóng Dật", paliName: "Appamādavagga", start: 21, end: 32 },
  { id: 3, name: "Tâm", paliName: "Cittavagga", start: 33, end: 43 },
  { id: 4, name: "Hoa", paliName: "Pupphavagga", start: 44, end: 59 },
  { id: 5, name: "Kẻ Ngu", paliName: "Bālavagga", start: 60, end: 75 },
  { id: 6, name: "Hiền Trí", paliName: "Paṇḍitavagga", start: 76, end: 89 },
  { id: 7, name: "A-La-Hán", paliName: "Arahantavagga", start: 90, end: 99 },
  { id: 8, name: "Ngàn", paliName: "Sahassavagga", start: 100, end: 115 },
  { id: 9, name: "Ác", paliName: "Pāpavagga", start: 116, end: 128 },
  { id: 10, name: "Hình Phạt", paliName: "Daṇḍavagga", start: 129, end: 145 },
  { id: 11, name: "Già", paliName: "Jarāvagga", start: 146, end: 156 },
  { id: 12, name: "Tự Ngã", paliName: "Attavagga", start: 157, end: 166 },
  { id: 13, name: "Thế Gian", paliName: "Lokavagga", start: 167, end: 178 },
  { id: 14, name: "Phật Đà", paliName: "Buddhavagga", start: 179, end: 196 },
  { id: 15, name: "An Lạc", paliName: "Sukhavagga", start: 197, end: 208 },
  { id: 16, name: "Hỷ Ái", paliName: "Piyavagga", start: 209, end: 220 },
  { id: 17, name: "Phẫn Nộ", paliName: "Kodhavagga", start: 221, end: 234 },
  { id: 18, name: "Cấu Uế", paliName: "Malavagga", start: 235, end: 255 },
  { id: 19, name: "Pháp Trụ", paliName: "Dhammaṭṭhavagga", start: 256, end: 272 },
  { id: 20, name: "Đạo", paliName: "Maggavagga", start: 273, end: 289 },
  { id: 21, name: "Tạp Lục", paliName: "Pakiṇṇakavagga", start: 290, end: 305 },
  { id: 22, name: "Địa Ngục", paliName: "Nirayavagga", start: 306, end: 319 },
  { id: 23, name: "Voi", paliName: "Nāgavagga", start: 320, end: 333 },
  { id: 24, name: "Tham Ái", paliName: "Taṇhāvagga", start: 334, end: 359 },
  { id: 25, name: "Tỷ Kheo", paliName: "Bhikkhuvagga", start: 360, end: 382 },
  { id: 26, name: "Bà-La-Môn", paliName: "Brāhmaṇavagga", start: 383, end: 423 },
];

function decodeEntities(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, " ");
}

function chapterForId(id) {
  return CHAPTERS.find((c) => id >= c.start && id <= c.end)?.id ?? 1;
}

function cleanLines(raw) {
  return raw
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((l) =>
      l
        .replace(/^["“]+/, "")
        .replace(/["”]+\.?$/, "")
        .replace(/\s*\.\s*$/, "")
        .trim(),
    )
    .filter(Boolean);
}

function parseFile(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const verses = new Map();

  // Verse cells are narrow columns (WIDTH ~48–52%). Avoid outer layout <td valign=top>.
  const tdBlocks = [
    ...html.matchAll(
      /<td[^>]*WIDTH="\d+%"[^>]*(?:VALIGN|valign)="top"[^>]*>([\s\S]*?)<\/td>/gi,
    ),
  ];

  for (const match of tdBlocks) {
    let cell = match[1];
    const font = cell.match(/<font[^>]*>([\s\S]*?)<\/font>/i);
    if (font) cell = font[1];

    cell = decodeEntities(
      cell
        .replace(/\r?\n/g, " ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/?[^>]+>/g, "")
        .replace(/[ \t]+/g, " "),
    ).trim();

    const m = cell.match(/^(\d{1,3})\.?\s*([\s\S]*)$/);
    if (!m) continue;
    const id = Number(m[1]);
    if (!Number.isInteger(id) || id < 1 || id > 423) continue;

    const lines = cleanLines(m[2]);
    if (lines.length === 0) continue;

    if (!verses.has(id) || lines.length >= verses.get(id).lines.length) {
      verses.set(id, { id, chapterId: chapterForId(id), lines });
    }
  }
  return verses;
}

const all = new Map();
for (const name of ["pc1.html", "pc2.html", "pc3.html"]) {
  const file = path.join(__dirname, name);
  for (const [id, v] of parseFile(file)) all.set(id, v);
}

const missing = [];
for (let i = 1; i <= 423; i++) if (!all.has(i)) missing.push(i);

const verses = Array.from(all.values()).sort((a, b) => a.id - b.id);
const out = {
  source: "HT. Thích Minh Châu",
  sourceNote:
    "Bản dịch Việt ngữ Kinh Pháp Cú (Dhammapada), Hòa thượng Thích Minh Châu. Nội dung được biên soạn để học thuộc trong BuddaInHere.",
  totalVerses: verses.length,
  chapters: CHAPTERS.map(({ id, name, paliName }) => ({ id, name, paliName })),
  verses,
};

const outPath = path.join(root, "src", "data", "dhammapada.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
console.log(`Wrote ${verses.length} verses → ${outPath}`);
if (missing.length) {
  console.warn(`Missing ${missing.length}:`, missing.slice(0, 40).join(", "), missing.length > 40 ? "..." : "");
  process.exitCode = 1;
} else {
  console.log("OK — full 423");
  console.log("1:", verses[0].lines.join(" | "));
  console.log("183:", verses[182].lines.join(" | "));
  console.log("423:", verses[422].lines.join(" | "));
}
