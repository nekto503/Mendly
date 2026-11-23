"use client";

// Экспорт заметки в PDF: собранный документ печатается из скрытого iframe —
// браузер сам предлагает «Сохранить как PDF», без внешних библиотек

import { renderMarkdown } from "./MarkdownPreview";
import type { Note } from "./types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const PRINT_CSS = `
  @page { margin: 22mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: #16262e; line-height: 1.65; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #d8e2e6; padding-bottom: 10px; margin-bottom: 28px; }
  .brand { font-family: Arial, sans-serif; letter-spacing: 0.22em; font-weight: 700; color: #0a2129; font-size: 12px; }
  .brand i { display: inline-block; width: 7px; height: 7px; border-radius: 99px; background: #db3996; margin-left: 6px; }
  .date { font-size: 11px; color: #6d828c; font-family: Arial, sans-serif; }
  h1 { font-size: 26px; line-height: 1.25; margin: 0 0 24px; }
  h1, h2, h3, h4 { color: #0a2129; }
  h2 { font-size: 19px; margin: 28px 0 10px; }
  h3 { font-size: 16px; margin: 22px 0 8px; }
  p { margin: 10px 0; }
  a { color: #0593c6; text-decoration: none; word-break: break-all; }
  ul, ol { padding-left: 22px; margin: 10px 0; }
  li { margin: 4px 0; }
  blockquote { margin: 14px 0; padding: 10px 16px; border-left: 3px solid #db3996; background: #faf5f8; color: #524351; }
  code { font-family: "Courier New", monospace; font-size: 0.9em; background: #f0f4f6; padding: 2px 5px; border-radius: 4px; }
  pre { background: #0a2129; color: #e8f4f8; padding: 14px 16px; border-radius: 8px; overflow-x: auto; }
  pre code { background: transparent; color: inherit; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 14px 0; font-family: Arial, sans-serif; font-size: 13px; }
  th, td { border: 1px solid #d8e2e6; padding: 7px 10px; text-align: left; }
  th { background: #f0f4f6; }
  img { max-width: 100%; }
  hr { border: none; border-top: 1px solid #d8e2e6; margin: 22px 0; }
  input[type="checkbox"] { accent-color: #db3996; margin-right: 6px; }
  footer { margin-top: 34px; border-top: 1px solid #d8e2e6; padding-top: 10px; font-size: 10px; color: #9aaeb7; font-family: Arial, sans-serif; letter-spacing: 0.12em; }
`;

export function exportNotePdf(note: Note) {
  const date = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const doc = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${esc(note.title)}</title><style>${PRINT_CSS}</style></head><body>
    <header><span class="brand">MINDLY<i></i></span><span class="date">${date}</span></header>
    <h1>${esc(note.title)}</h1>
    <article>${renderMarkdown(note.content)}</article>
    <footer>MINDLY — место для твоих мыслей</footer>
  </body></html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument;
  if (!idoc) return;
  idoc.open();
  idoc.write(doc);
  idoc.close();

  const cleanup = () => {
    window.removeEventListener("afterprint", cleanup);
    window.setTimeout(() => iframe.remove(), 500);
  };
  window.addEventListener("afterprint", cleanup);
  const w = iframe.contentWindow;
  if (w) {
    // Даём документу примениться и печатаем
    window.setTimeout(() => {
      w.focus();
      w.print();
    }, 120);
  }
}
