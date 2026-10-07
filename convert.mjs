// Markdown -> PDF (Blue / Navy theme, Thai font Sarabun)
//
// Usage:
//   node convert.mjs input/file.md [output/file.pdf] [--exam]
//
// --exam  adds blank answer lines after every question (exam / worksheet files).
// Without it the file is converted as a normal summary.

import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const exam = args.includes("--exam");
const [input, outArg] = args.filter((a) => !a.startsWith("--"));
if (!input) {
  console.error("Usage: node convert.mjs input.md [output.pdf] [--exam]");
  process.exit(1);
}
const output = resolve(outArg ?? join(here, "output", basename(input).replace(/\.md$/i, ".pdf")));

// 1. Markdown -> HTML body (pandoc, GitHub flavour: tables, task lists; $...$ math)
const body = execFileSync(
  "pandoc",
  ["-f", "gfm+tex_math_dollars", "-t", "html5", "--mathml", "--wrap=none", resolve(input)],
  { encoding: "utf8" }
);

// 2. Embedded Sarabun font faces
const fontFaces = ["thai", "latin"]
  .flatMap((subset) =>
    [400, 600, 700].flatMap((w) =>
      ["normal", "italic"].map((style) => {
        const file = join(here, "fonts", `sarabun-${subset}-${w}-${style}.woff2`);
        const range = subset === "thai" ? "U+0E01-0E5B, U+200C-200D, U+25CC" : "U+0000-0E00, U+0E5C-FFFF";
        return `@font-face{font-family:"Sarabun";font-style:${style};font-weight:${w};` +
          `src:url(data:font/woff2;base64,${readFileSync(file).toString("base64")}) format("woff2");unicode-range:${range};}`;
      })
    )
  )
  .join("\n");

const css = readFileSync(join(here, "style.css"), "utf8");
const title = (readFileSync(input, "utf8").match(/^#\s+(.+)$/m) || [, basename(input)])[1];

const html = `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><title>${title}</title>
<style>${fontFaces}\n${css}</style></head>
<body>${body}</body></html>`;

// 3. Render with Chromium
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);

await page.evaluate((exam) => {
  // First h1 becomes the title banner (no page break before it)
  const first = document.querySelector("h1");
  if (first) {
    const banner = document.createElement("div");
    banner.className = "title-banner";
    first.replaceWith(banner);
    banner.appendChild(first);
    const sub = document.createElement("div");
    sub.className = "subtitle";
    sub.textContent = exam ? "แบบทดสอบ / ข้อสอบ" : "เอกสารสรุปเนื้อหา";
    banner.appendChild(sub);
    banner.style.breakBefore = "auto";
  }

  // A part heading starts a new page only when its part is long (> ~1 page of text)
  const h1s = [...document.querySelectorAll("body > h1")];
  h1s.forEach((h) => {
    let len = 0;
    for (let n = h.nextElementSibling; n && n.tagName !== "H1"; n = n.nextElementSibling) len += n.textContent.length;
    if (len > 2500) h.classList.add("new-page");
  });

  if (!exam) return;
  const box = (lines) => {
    const d = document.createElement("div");
    d.className = "answer-space";
    d.innerHTML = '<div class="label">คำตอบ</div>' + '<div class="ln"></div>'.repeat(lines);
    return d;
  };
  // Questions = top-level ordered list items, plus headings that start with "ข้อ" / "โจทย์"
  document.querySelectorAll("body > ol > li").forEach((li) => li.appendChild(box(4)));
  document.querySelectorAll("h2, h3, h4").forEach((h) => {
    if (/^(ข้อ|โจทย์|คำถาม|Question|Q\d)/i.test(h.textContent.trim())) {
      let n = h.nextElementSibling;
      while (n && !/^H[1-4]$/.test(n.nextElementSibling?.tagName ?? "H1")) n = n.nextElementSibling;
      (n ?? h).after(box(6));
    }
  });
}, exam);

mkdirSync(dirname(output), { recursive: true });
const short = title.length > 70 ? title.slice(0, 70) + "…" : title;
await page.pdf({
  path: output,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: `<div style="width:100%;font-family:Sarabun,sans-serif;font-size:8px;color:#1d4e89;
      padding:0 17mm;display:flex;justify-content:space-between;border-bottom:0.5px solid #c9dcf2;">
      <span>${short.replace(/</g, "&lt;")}</span></div>`,
  footerTemplate: `<div style="width:100%;font-family:Sarabun,sans-serif;font-size:8px;color:#0b2545;
      padding:0 17mm;text-align:center;">หน้า <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
});
await browser.close();
console.log("PDF created:", output);
