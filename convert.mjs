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

  // Plain-text subscripts in formulas: V_จม, P_net, ρ_วัตถุ -> <sub>
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) if (!walker.currentNode.parentElement.closest("code, pre, math")) texts.push(walker.currentNode);
  // subscript = one optional capital + lowercase/digits (P_iV_i -> P<sub>i</sub>V<sub>i</sub>, ρ_Hg, P_net) or Thai
  const subRe = /([A-Za-zα-ωΑ-Ω0-9₀-₉)])_([A-Z]?[a-z0-9]+|[A-Z]|[ก-๙]+)/g;
  texts.forEach((t) => {
    if (!subRe.test(t.data)) return;
    const span = document.createElement("span");
    span.innerHTML = t.data
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(subRe, "$1<sub>$2</sub>");
    t.replaceWith(...span.childNodes);
  });

  // A part heading starts a new page only when its part is long (> ~1 page of text)
  const h1s = [...document.querySelectorAll("body > h1")];
  h1s.forEach((h) => {
    let len = 0;
    for (let n = h.nextElementSibling; n && n.tagName !== "H1"; n = n.nextElementSibling) len += n.textContent.length;
    if (len > 2500) h.classList.add("new-page");
  });

  // Long tables may split between rows (header repeats) instead of leaving a half-empty page
  document.querySelectorAll("table").forEach((t) => {
    if (t.querySelectorAll("tbody tr").length > 8) t.classList.add("long");
  });

  if (!exam) return;
  const box = (lines) => {
    const d = document.createElement("div");
    d.className = "answer-space";
    d.innerHTML = '<div class="label">คำตอบ</div>' + '<div class="ln"></div>'.repeat(lines);
    return d;
  };
  // Multiple-choice questions written as "**1.** question" + a list of choices (ก. ข. ค. ...):
  // wrap each question so it never splits across pages, then add a choice row and working lines
  document.querySelectorAll("body > p").forEach((p) => {
    const num = p.firstElementChild;
    if (!num || num.tagName !== "STRONG" || p.firstChild !== num || !/^\d+\.$/.test(num.textContent.trim())) return;
    const q = document.createElement("div");
    q.className = "question";
    p.before(q);
    q.appendChild(p);
    let choices = null;
    while (q.nextElementSibling && /^(UL|OL|BLOCKQUOTE|TABLE)$/.test(q.nextElementSibling.tagName)) {
      const n = q.nextElementSibling;
      if (n.tagName === "UL" && !choices) { n.classList.add("choices"); choices = n; }
      q.appendChild(n);
    }
    const labels = choices
      ? [...choices.children].map((li) => (li.textContent.trim().match(/^([ก-ฮ])\./) || [])[1]).filter(Boolean)
      : [];
    const calc = /คำนวณ|จงหา|เท่าไร|เท่าใด|ผลลัพธ์|\d+(\.\d+)?\s*(กรัม|mL|ml|ซม|M\b)/.test(p.textContent);
    const ans = box(calc ? 3 : 1);
    ans.querySelector(".label").innerHTML = calc ? "แสดงวิธีคิด / คำตอบ" : "บันทึก";
    if (labels.length) {
      const row = document.createElement("div");
      row.className = "pick";
      row.innerHTML = "<span>ตอบ</span>" + labels.map((l) => `<span class="opt">${l}</span>`).join("");
      ans.prepend(row);
    }
    q.appendChild(ans);
  });

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
