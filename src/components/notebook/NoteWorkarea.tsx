"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  FileDown,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Paperclip,
  Pencil,
  Minus,
  Quote,
  SquarePen,
  Star,
  Trash2,
  Waypoints,
  Bold,
  Italic,
  Code,
  Heading1,
  Heading2,
} from "lucide-react";
import { toast } from "sonner";
import { backlinksFor, extractLinks, pluralRu, useNotebook } from "./store";
import { useSettings } from "./settings";
import { exportNotePdf } from "./export-pdf";
import MarkdownPreview from "./MarkdownPreview";
import type { Note } from "./types";
import { cn } from "@/lib/utils";

// Панель инструментов markdown: вставки в позицию курсора
function surroundSelection(ta: HTMLTextAreaElement, before: string, after = before, placeholder = "текст") {
  const { selectionStart, selectionEnd, value } = ta;
  const selected = value.slice(selectionStart, selectionEnd) || placeholder;
  const next = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
  return { next, caret: selectionStart + before.length + selected.length + after.length };
}

function prefixLines(ta: HTMLTextAreaElement, prefix: string, numbered = false) {
  const { selectionStart, selectionEnd, value } = ta;
  const start = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const end = value.indexOf("\n", selectionEnd) === -1 ? value.length : value.indexOf("\n", selectionEnd);
  const chunk = value.slice(start, end) || "текст";
  const lines = chunk.split("\n");
  const updated = lines.map((l, i) => `${numbered ? `${i + 1}.` : prefix} ${l.replace(/^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|- \[[ x]\]\s)/, "")}`);
  const next = value.slice(0, start) + updated.join("\n") + value.slice(end);
  return { next, caret: start + updated.join("\n").length };
}

type Props = { note: Note };

// Рабочая область заметки: заголовок, два отдельных режима — правка и чтение,
// панель markdown, статичный (не мигающий) курсор-палочка в редакторе, бэклинки
export default function NoteWorkarea({ note }: Props) {
  const mode = useNotebook((s) => s.mode);
  const setMode = useNotebook((s) => s.setMode);
  const updateLocalNote = useNotebook((s) => s.updateLocalNote);
  const persistNote = useNotebook((s) => s.persistNote);
  const toggleStar = useNotebook((s) => s.toggleStar);
  const trashNote = useNotebook((s) => s.trashNote);
  const setAttachModal = useNotebook((s) => s.setAttachModal);
  const notes = useNotebook((s) => s.notes);
  const folders = useNotebook((s) => s.folders);
  const attachments = useNotebook((s) => s.attachments);
  const openNote = useNotebook((s) => s.openNote);
  const createNote = useNotebook((s) => s.createNote);
  const saving = useNotebook((s) => s.saving);
  // Настройки редактора: орфография, счётчик слов, подтверждение удаления
  const spellcheck = useSettings((s) => s.settings.spellcheck);
  const showWordCount = useSettings((s) => s.settings.showWordCount);
  const confirmDelete = useSettings((s) => s.settings.confirmDelete);

  const [buffer, setBuffer] = useState(note.content);
  const [title, setTitle] = useState(note.title);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);

  const scheduleSave = () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      persistNote(note.id);
    }, 700);
  };

  const onBufferChange = (v: string) => {
    setBuffer(v);
    updateLocalNote(note.id, { content: v });
    scheduleSave();
  };

  const onTitleChange = (v: string) => {
    setTitle(v);
    updateLocalNote(note.id, { title: v || "Без названия" });
    scheduleSave();
  };

  /* ---------- статичный курсор: прозрачный родной + ровная палочка поверх ---------- */
  // Позиция палочки считается в зеркальном слое с той же типографикой,
  // поэтому палочка стоит ровно там, где реально встанет следующий символ
  const syncCaret = () => {
    const ta = taRef.current;
    const mirror = mirrorRef.current;
    const caret = caretRef.current;
    if (!ta || !mirror || !caret) return;
    const collapsed = ta.selectionStart === ta.selectionEnd;
    if (document.activeElement !== ta || !collapsed) {
      caret.style.opacity = "0";
      return;
    }
    const text = ta.value.slice(0, ta.selectionStart);
    const marker = document.createElement("span");
    marker.textContent = "\u200b";
    mirror.replaceChildren(document.createTextNode(text), marker);
    const x = marker.offsetLeft - ta.scrollLeft;
    const y = marker.offsetTop - ta.scrollTop;
    const lh = parseFloat(window.getComputedStyle(ta).lineHeight) || 20;
    caret.style.transform = `translate(${x}px, ${y}px)`;
    caret.style.height = `${lh}px`;
    caret.style.opacity = "1";
  };

  // Пересчёт при вводе, навигации клавишами, клике, скролле и смене размеров
  useEffect(() => {
    syncCaret();
  }, [buffer, mode]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta || mode !== "edit") return;
    const onWinResize = () => syncCaret();
    window.addEventListener("resize", onWinResize);
    const ro = new ResizeObserver(() => syncCaret());
    ro.observe(ta);
    return () => {
      window.removeEventListener("resize", onWinResize);
      ro.disconnect();
    };
  }, [mode]);

  const caretEventProps = {
    onInput: syncCaret,
    onSelect: syncCaret,
    onClick: syncCaret,
    onKeyUp: syncCaret,
    onFocus: syncCaret,
    onBlur: () => {
      if (caretRef.current) caretRef.current.style.opacity = "0";
    },
    onScroll: syncCaret,
  } as const;

  // Вставка из модалки вложений и других источников
  useEffect(() => {
    const onInsert = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      const ta = taRef.current;
      if (!ta) {
        // Редактор не в фокусе — вставим в конец
        onBufferChange(buffer + (buffer.endsWith("\n") ? "" : "\n") + text);
        return;
      }
      const at = ta.selectionStart ?? buffer.length;
      const next = buffer.slice(0, at) + text + buffer.slice(ta.selectionEnd ?? at);
      onBufferChange(next);
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = at + text.length;
        syncCaret();
      });
    };
    window.addEventListener("mindly:editor-insert", onInsert);
    return () => window.removeEventListener("mindly:editor-insert", onInsert);
  }, [buffer]);

  // Экспорт в PDF по команде
  useEffect(() => {
    const onExport = () => exportNotePdf({ ...note, content: buffer, title });
    window.addEventListener("mindly:export-active-note", onExport);
    return () => window.removeEventListener("mindly:export-active-note", onExport);
  }, [note, buffer, title]);

  // Горячие клавиши редактора
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const apply = (res: { next: string; caret: number }) => {
      e.preventDefault();
      onBufferChange(res.next);
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = res.caret;
        syncCaret();
      });
    };
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      apply(surroundSelection(ta, "**", "**", "жирный"));
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      apply(surroundSelection(ta, "*", "*", "курсив"));
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      persistNote(note.id);
      return;
    }
    // Tab внутри списка — два пробела
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart, selectionEnd, value } = ta;
      const next = value.slice(0, selectionStart) + "  " + value.slice(selectionEnd);
      onBufferChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = selectionStart + 2;
        syncCaret();
      });
    }
  };

  // Тулбар: применяем вставку к textarea
  const tool = (kind: string) => {
    const ta = taRef.current;
    if (!ta) {
      setMode("edit");
      toast.info("Переключись в правку — и панели заработают");
      return;
    }
    const apply = (res: { next: string; caret: number }) => {
      onBufferChange(res.next);
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = res.caret;
        syncCaret();
      });
    };
    switch (kind) {
      case "bold":
        apply(surroundSelection(ta, "**", "**", "жирный"));
        break;
      case "italic":
        apply(surroundSelection(ta, "*", "*", "курсив"));
        break;
      case "code":
        apply(surroundSelection(ta, "`", "`", "код"));
        break;
      case "h1":
        apply(prefixLines(ta, "#"));
        break;
      case "h2":
        apply(prefixLines(ta, "##"));
        break;
      case "ul":
        apply(prefixLines(ta, "-"));
        break;
      case "ol":
        apply(prefixLines(ta, "", true));
        break;
      case "todo":
        apply(prefixLines(ta, "- [ ]"));
        break;
      case "quote":
        apply(prefixLines(ta, ">"));
        break;
      case "hr":
        apply(surroundSelection(ta, "\n\n---\n\n", "", ""));
        break;
      case "link": {
        const url = window.prompt("Адрес ссылки:", "https://");
        if (url) apply(surroundSelection(ta, "[", `](${url})`, "текст"));
        break;
      }
      case "github": {
        const url = window.prompt("Ссылка на GitHub — репозиторий, issue или gist:", "https://github.com/");
        if (url) apply(surroundSelection(ta, "", "", url));
        break;
      }
      case "wikilink":
        apply(surroundSelection(ta, "[[", "]]", "название заметки"));
        break;
      case "attachment": {
        setAttachModal(true);
        break;
      }
    }
  };

  // Статистика и связи
  const stats = useMemo(() => {
    const words = buffer.trim() ? buffer.trim().split(/\s+/).length : 0;
    return { words, chars: buffer.length };
  }, [buffer]);

  const backlinks = useMemo(() => backlinksFor(note, notes), [note, notes]);
  const outLinks = useMemo(() => {
    const found = extractLinks(buffer);
    const uniq = [...new Set(found)].slice(0, 10);
    return uniq.map((t) => {
      const target = notes.find((n) => !n.trashed && n.title.toLowerCase() === t);
      return { title: t, id: target?.id ?? null };
    });
  }, [buffer, notes]);

  const folder = folders.find((f) => f.id === note.folderId);
  const noteAtts = attachments.filter((a) => a.noteId === note.id);

  const TOOLS = [
    { k: "bold", icon: Bold, label: "Жирный — Ctrl+B" },
    { k: "italic", icon: Italic, label: "Курсив — Ctrl+I" },
    { k: "h1", icon: Heading1, label: "Заголовок 1" },
    { k: "h2", icon: Heading2, label: "Заголовок 2" },
    { k: "ul", icon: List, label: "Список" },
    { k: "ol", icon: ListOrdered, label: "Нумерованный список" },
    { k: "todo", icon: ListTodo, label: "Список задач" },
    { k: "quote", icon: Quote, label: "Цитата" },
    { k: "code", icon: Code, label: "Код" },
    { k: "link", icon: Link2, label: "Ссылка" },
    { k: "github", icon: Waypoints, label: "GitHub-ссылка" },
    { k: "wikilink", icon: Pencil, label: "Внутренняя ссылка [[заметка]]" },
    { k: "attachment", icon: Paperclip, label: "Вложение" },
    { k: "hr", icon: Minus, label: "Разделитель" },
  ];

  const MODES = [
    { k: "edit", icon: SquarePen, label: "Правка" },
    { k: "read", icon: BookOpen, label: "Чтение" },
  ] as const;

  return (
    <div className="flex h-full min-h-0">
      {/* Основная колонка */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Шапка заметки */}
        <div className="nb-note-head">
          <div className="min-w-0 flex-1">
            <p className="nb-breadcrumb">
              {folder ? `${folder.name} /` : ""} {saving ? "сохранение…" : "сохранено"}
            </p>
            <input
              className="nb-title-input"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              aria-label="Заголовок заметки"
              placeholder="Название заметки"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className={cn("nb-icon-btn", note.starred && "text-[#db3996]")}
              onClick={() => toggleStar(note.id)}
              aria-label={note.starred ? "Убрать из избранного" : "В избранное"}
              title={note.starred ? "Убрать из избранного" : "В избранное"}
            >
              <Star className={cn("h-4 w-4", note.starred && "fill-current")} />
            </button>
            <button
              type="button"
              className="nb-icon-btn"
              onClick={() => exportNotePdf({ ...note, content: buffer, title })}
              aria-label="Экспорт в PDF"
              title="Экспорт в PDF"
            >
              <FileDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="nb-icon-btn"
              onClick={() => {
                if (confirmDelete) {
                  if (window.confirm(`«${title}» уедет в корзину. Вернуть можно там же.`)) {
                    trashNote(note.id);
                    toast.success("Заметка в корзине");
                  }
                  return;
                }
                trashNote(note.id);
                toast.success("Заметка в корзине");
              }}
              aria-label="Удалить в корзину"
              title="В корзину"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Режимы: правка и чтение — два отдельных режима */}
        <div className="nb-mode" role="tablist" aria-label="Режим редактора">
          {MODES.map((m) => (
            <button
              key={m.k}
              type="button"
              role="tab"
              aria-selected={mode === m.k}
              className={cn("nb-mode-btn", mode === m.k && "is-active")}
              onClick={() => setMode(m.k)}
            >
              <m.icon className="h-3.5 w-3.5" />
              <span>{m.label}</span>
            </button>
          ))}
          {showWordCount && (
            <span className="ml-auto pr-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--nb-faint)]">
              {stats.words} {pluralRu(stats.words, "слово", "слова", "слов")}
            </span>
          )}
        </div>

        {/* Тулбар markdown — только в правке */}
        {mode === "edit" && (
          <div className="nb-toolbar" role="toolbar" aria-label="Форматирование markdown">
            {TOOLS.map((t) => (
              <button
                key={t.k}
                type="button"
                className="nb-tool"
                onClick={() => tool(t.k)}
                aria-label={t.label}
                title={t.label}
              >
                <t.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        )}

        {/* Тело: правка или чтение */}
        {mode === "edit" ? (
          <div className="nb-editor-wrap">
            <textarea
              ref={taRef}
              className="nb-editor nb-editor-solid-caret"
              value={buffer}
              onChange={(e) => onBufferChange(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={spellcheck}
              placeholder={"Пиши… markdown поддерживается:\n# заголовок\n- список\n**жирный**, *курсив*\n[[ссылка на заметку]]"}
              aria-label="Текст заметки в markdown"
              {...caretEventProps}
            />
            {/* Зеркало с той же типографикой — по нему стоит палочка */}
            <div ref={mirrorRef} className="nb-caret-mirror" aria-hidden="true" />
            <div ref={caretRef} className="nb-caret" aria-hidden="true" />
          </div>
        ) : (
          <div className="nb-preview nb-scroll">
            {buffer.trim() ? (
              <MarkdownPreview note={{ ...note, content: buffer }} />
            ) : (
              <p className="nb-empty">Заметка пока пустая — переключись в правку и напиши первую строку.</p>
            )}
          </div>
        )}
      </div>

      {/* Правая панель: свойства и связи — на широких экранах */}
      <aside className="nb-aside nb-scroll" aria-label="Свойства заметки">
        <h3 className="nb-section-title">свойства</h3>
        <dl className="nb-props">
          <div>
            <dt>папка</dt>
            <dd>{folder?.name ?? "без папки"}</dd>
          </div>
          <div>
            <dt>изменено</dt>
            <dd>{new Date(note.updatedAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</dd>
          </div>
          <div>
            <dt>символов</dt>
            <dd>{stats.chars}</dd>
          </div>
          <div>
            <dt>вложений</dt>
            <dd>{noteAtts.length}</dd>
          </div>
        </dl>

        <h3 className="nb-section-title mt-6">
          <ArrowUp className="h-3 w-3" /> упоминают · {backlinks.length}
        </h3>
        {backlinks.length === 0 && <p className="nb-empty">Пока ни одна заметка не ссылается здесь.</p>}
        {backlinks.map((b) => (
          <button key={b.id} type="button" className="nb-link-row" onClick={() => openNote(b.id)}>
            {b.title}
          </button>
        ))}

        <h3 className="nb-section-title mt-6">
          <ArrowDown className="h-3 w-3" /> ведут в · {outLinks.length}
        </h3>
        {outLinks.length === 0 && <p className="nb-empty">Ссылок [[на другие заметки]] пока нет.</p>}
        {outLinks.map((l) => (
          <button
            key={l.title}
            type="button"
            className="nb-link-row"
            onClick={async () => {
              if (l.id) {
                openNote(l.id);
                return;
              }
              const created = await createNote(note.folderId);
              if (created) {
                updateLocalNote(created.id, { title: l.title });
                await persistNote(created.id, { title: l.title });
                openNote(created.id);
              }
            }}
          >
            {l.title}
            {!l.id && <span className="nb-link-new">создать</span>}
          </button>
        ))}
      </aside>
    </div>
  );
}
