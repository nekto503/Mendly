"use client";

import { useEffect, useMemo, useRef } from "react";
import { marked } from "marked";
import { useNotebook } from "./store";
import type { Note } from "./types";

marked.setOptions({ gfm: true, breaks: true });

// Разбиваем исходник на код/не-код, чтобы декор не задел содержимое блоков кода
function transformSegments(src: string, fn: (segment: string) => string): string {
  return src
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((seg, i) => (i % 2 === 1 ? seg : fn(seg)))
    .join("");
}

const escAttr = (s: string) => s.replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Защита от HTML-инъекций: угловые скобки в исходнике превращаются в текст,
// поэтому чужой HTML и обработчики событий не попадут в разметку чтения.
// Markdown-синтаксис (звёзды, решётки, скобки) при этом не страдает.
const escHtml = (s: string) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Декор исходника до парсинга: [[вики-ссылки]], [[file:вложения]], голые GitHub-ссылки
export function preDecorate(src: string): string {
  return transformSegments(src, (seg) =>
    escHtml(seg)
      .replace(/\[\[file:([^\]\n]+)\]\]/g, (_m, name: string) => `<a href="#" class="md-att" data-att="${escAttr(name.trim())}">${name.trim()}</a>`)
      .replace(/\[\[([^\]\n|]+)\]\]/g, (_m, name: string) => `<a href="#" class="md-wikilink" data-wikilink="${escAttr(name.trim())}">${name.trim()}</a>`)
      .replace(/(^|[\s(])(https?:\/\/(?:www\.)?github\.com[^\s<)]+)/g, (_m, pre: string, url: string) => `${pre}<a href="${escAttr(url)}" target="_blank" rel="noreferrer" class="md-gh">${url}</a>`)
  );
}

// Markdown → HTML с декором и защитой от скриптов
export function renderMarkdown(src: string): string {
  const html = marked.parse(preDecorate(src), { async: false });
  return html.replace(/<script[\s\S]*?<\/script>/gi, "");
}

const GH_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 2.87-.39c.97 0 1.95.13 2.87.39 2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.73.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.67.8.56A11.52 11.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>';

// Чтение: рендер markdown + живое поведение (ссылки, теги, вложения, чекбоксы)
export default function MarkdownPreview({ note }: { note: Note }) {
  const html = useMemo(() => renderMarkdown(note.content), [note.content]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    /* Чекбоксы: включаем и связываем с N-м маркером задачи в исходнике */
    const boxes = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    boxes.forEach((box, target) => {
      box.removeAttribute("disabled");
      box.classList.add("md-task");
      box.addEventListener("click", (e) => {
        e.preventDefault();
        const s = useNotebook.getState();
        const src = s.notes.find((n) => n.id === note.id)?.content ?? note.content;
        // Меняем только настоящие маркеры задач: "- [ ]", "* [x]", "2. [ ]"
        const re = /^(\s*(?:[-*+]|\d+\.)\s+\[)( |x|X)(\])/gm;
        let i = 0;
        const newSrc = src.replace(re, (full, pre: string, mark: string, post: string) => {
          if (i++ === target) return pre + (mark === " " ? "x" : " ") + post;
          return full;
        });
        if (newSrc !== src) {
          s.updateLocalNote(note.id, { content: newSrc });
          s.persistNote(note.id);
        }
      });
    });

    /* Внутренние ссылки: открываем существующую заметку или создаём новую */
    root.querySelectorAll<HTMLAnchorElement>("a.md-wikilink").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const title = a.dataset.wikilink ?? "";
        if (!title) return;
        const s = useNotebook.getState();
        const existing = s.notes.find(
          (n) => !n.trashed && n.title.toLowerCase() === title.toLowerCase()
        );
        if (existing) {
          s.openNote(existing.id);
          return;
        }
        s.createNote(null).then((created) => {
          if (!created) return;
          s.updateLocalNote(created.id, { title });
          s.persistNote(created.id, { title });
          s.openNote(created.id);
        });
      });
    });

    /* Вложения: открываем по имени, а не найдено — зовём модалку */
    root.querySelectorAll<HTMLAnchorElement>("a.md-att").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const name = (a.dataset.att ?? "").toLowerCase();
        const s = useNotebook.getState();
        const att = s.attachments.find((x) => x.name.toLowerCase() === name);
        if (att) s.openAttachment(att.id);
        else s.setAttachModal(true);
      });
    });

    /* GitHub-ссылки: иконка внутри живой карточки */
    root.querySelectorAll<HTMLAnchorElement>("a.md-gh").forEach((a) => {
      a.insertAdjacentHTML("afterbegin", GH_ICON);
    });
  }, [html, note.id, note.content]);

  return <div ref={ref} className="md-body" dangerouslySetInnerHTML={{ __html: html }} />;
}
