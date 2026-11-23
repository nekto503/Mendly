"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Copy,
  FileText,
  FilePlus2,
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  LogOut,
  Paperclip,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Star,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useNotebook } from "./store";
import { useSettings } from "./settings";
import { avatarColor } from "@/components/site/SiteHeader";
import type { Folder, Note } from "./types";
import { cn } from "@/lib/utils";

type CtxTarget =
  | { kind: "note"; id: string; x: number; y: number }
  | { kind: "folder"; id: string; x: number; y: number };

type EditTarget = { kind: "note" | "folder"; id: string } | null;

// Ключ дерева раскрытых папок — раскрывшееся остаётся раскрытым между визитами
const treeKey = (userId: string) => `mindly:tree:${userId}`;

function loadExpanded(userId: string, fallback: string[]): Set<string> {
  try {
    const raw = window.localStorage.getItem(treeKey(userId));
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* первый вход */
  }
  return new Set(fallback);
}

// Левая панель блокнота: поиск, кнопки создания, единое дерево папок и заметок,
// избранное, теги, вложения, корзина и карточка аккаунта
export default function Sidebar({ onLogout }: { onLogout: () => void }) {
  const notes = useNotebook((s) => s.notes);
  const folders = useNotebook((s) => s.folders);
  const attachments = useNotebook((s) => s.attachments);
  const search = useNotebook((s) => s.search);
  const setSearch = useNotebook((s) => s.setSearch);
  const openNote = useNotebook((s) => s.openNote);
  const openAttachment = useNotebook((s) => s.openAttachment);
  const createNote = useNotebook((s) => s.createNote);
  const duplicateNote = useNotebook((s) => s.duplicateNote);
  const toggleStar = useNotebook((s) => s.toggleStar);
  const restoreNote = useNotebook((s) => s.restoreNote);
  const deleteNoteForever = useNotebook((s) => s.deleteNoteForever);
  const createFolder = useNotebook((s) => s.createFolder);
  const renameFolder = useNotebook((s) => s.renameFolder);
  const deleteFolder = useNotebook((s) => s.deleteFolder);
  const updateLocalNote = useNotebook((s) => s.updateLocalNote);
  const persistNote = useNotebook((s) => s.persistNote);
  const setAttachModal = useNotebook((s) => s.setAttachModal);
  const setSidebar = useNotebook((s) => s.setSidebar);
  const user = useNotebook((s) => s.user);
  const tabs = useNotebook((s) => s.tabs);
  const activeKey = useNotebook((s) => s.activeKey);
  const confirmDelete = useSettings((s) => s.settings.confirmDelete);
  const setSettingsOpen = useSettings((s) => s.setOpen);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [favOpen, setFavOpen] = useState(true);
  const [trashOpen, setTrashOpen] = useState(false);
  const [ctx, setCtx] = useState<CtxTarget | null>(null);
  const [editing, setEditing] = useState<EditTarget>(null);
  const [editValue, setEditValue] = useState("");
  // Встроенное создание: null | "root-folder" | folderId (папка внутри папки)
  const [addingFolderIn, setAddingFolderIn] = useState<string | null | "root-folder" | null>(null);
  const [newFolderName, setNewFolderName] = useState("");

  const ctxRef = useRef<HTMLDivElement>(null);

  const liveNotes = useMemo(() => notes.filter((n) => !n.trashed), [notes]);
  const favorites = useMemo(() => liveNotes.filter((n) => n.starred), [liveNotes]);
  const trashed = useMemo(() => notes.filter((n) => n.trashed), [notes]);

  const query = search.trim().toLowerCase();
  const filtering = Boolean(query);
  const matchedNotes = useMemo(() => {
    if (!filtering) return [];
    return liveNotes.filter(
      (n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
    );
  }, [liveNotes, filtering, query]);

  /* ---------- раскрытие папок ---------- */
  // Ленивая инициализация дерева: ждём, пока папки приедут с сервера,
  // тогда раскрываем сохранённое либо папки верхнего уровня
  const [treeInit, setTreeInit] = useState(false);
  if (user && !treeInit && folders.length > 0) {
    setTreeInit(true);
    // По умолчанию раскрываем папки верхнего уровня — новичок сразу видит содержимое
    const roots = folders.filter((f) => !f.parentId).map((f) => f.id);
    setExpanded(loadExpanded(user.id, roots));
  }

  const persistExpanded = (next: Set<string>) => {
    setExpanded(next);
    if (!user) return;
    try {
      window.localStorage.setItem(treeKey(user.id), JSON.stringify([...next]));
    } catch {
      /* приватный режим — дерево живёт до перезагрузки */
    }
  };

  const toggleFolder = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persistExpanded(next);
  };

  const expandParents = (folderId: string | null) => {
    if (!folderId) return;
    const byId = new Map(folders.map((f) => [f.id, f]));
    const next = new Set(expanded);
    let cur = byId.get(folderId) ?? null;
    while (cur) {
      next.add(cur.id);
      cur = cur.parentId ? (byId.get(cur.parentId) ?? null) : null;
    }
    persistExpanded(next);
  };

  /* ---------- контекстное меню ---------- */
  useEffect(() => {
    if (!ctx) return;
    const close = (e: MouseEvent) => {
      if (ctxRef.current && ctxRef.current.contains(e.target as Node)) return;
      setCtx(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCtx(null);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [ctx]);

  const openCtx = (e: React.MouseEvent, kind: "note" | "folder", id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCtx({ kind, id, x: e.clientX, y: e.clientY });
  };

  /* ---------- активная заметка ---------- */
  const activeNoteId = useMemo(() => {
    const t = tabs.find((x) => x.key === activeKey);
    return t?.kind === "note" ? t.id : null;
  }, [tabs, activeKey]);

  /* ---------- текущая папка ---------- */
  // Папка, в которой пользователь находится сейчас: папка открытой заметки.
  // Кнопка «Заметка» кладёт новую заметку именно сюда.
  const currentFolderId = useMemo(() => {
    const note = notes.find((n) => n.id === activeNoteId);
    return note && !note.trashed ? note.folderId : null;
  }, [notes, activeNoteId]);
  const currentFolderName = useMemo(
    () => folders.find((f) => f.id === currentFolderId)?.name ?? null,
    [folders, currentFolderId]
  );

  /* ---------- структура дерева ---------- */
  const foldersByParent = useMemo(() => {
    const m = new Map<string | null, Folder[]>();
    for (const f of folders) {
      const arr = m.get(f.parentId ?? null) ?? [];
      arr.push(f);
      m.set(f.parentId ?? null, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    return m;
  }, [folders]);

  const notesByFolder = useMemo(() => {
    const m = new Map<string | null, Note[]>();
    for (const n of liveNotes) {
      const arr = m.get(n.folderId ?? null) ?? [];
      arr.push(n);
      m.set(n.folderId ?? null, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return m;
  }, [liveNotes]);

  /* ---------- действия ---------- */
  // Новая заметка попадает в текущую папку и сразу видна в дереве
  const handleCreateNote = async () => {
    const created = await createNote(currentFolderId);
    if (created) expandParents(created.folderId);
  };

  const commitCreateFolder = async () => {
    const name = newFolderName.trim();
    const parentId = addingFolderIn === "root-folder" ? null : addingFolderIn;
    setAddingFolderIn(null);
    setNewFolderName("");
    if (!name) return;
    try {
      const created = await createFolder(name, parentId);
      if (created && parentId) expandParents(parentId);
      if (created && !parentId) {
        const next = new Set(expanded);
        next.add(created.id);
        persistExpanded(next);
      }
      toast.success(`Папка «${name}» создана`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось создать папку");
    }
  };

  const commitRename = async () => {
    const target = editing;
    setEditing(null);
    const name = editValue.trim();
    if (!target || !name) return;
    if (target.kind === "folder") {
      await renameFolder(target.id, name);
    } else {
      const note = notes.find((n) => n.id === target.id);
      if (!note) return;
      updateLocalNote(target.id, { title: name });
      await persistNote(target.id, { title: name });
    }
  };

  const startRename = (kind: "note" | "folder", id: string, current: string) => {
    setEditing({ kind, id });
    setEditValue(current);
    setCtx(null);
  };

  const askDeleteNote = (n: Note) => {
    setCtx(null);
    if (confirmDelete) {
      if (window.confirm(`«${n.title}» уедет в корзину. Вернуть можно там же.`)) {
        void trashById(n.id);
      }
      return;
    }
    void trashById(n.id);
  };

  const trashById = async (id: string) => {
    const { trashNote } = useNotebook.getState();
    await trashNote(id);
    toast.success("Заметка в корзине");
  };

  const askDeleteFolder = (f: Folder) => {
    setCtx(null);
    if (window.confirm(`Папку «${f.name}» удалить? Вложенные папки удалятся вместе с ней, заметки останутся.`)) {
      void deleteFolder(f.id);
    }
  };

  /* ---------- строки дерева ---------- */
  const folderRow = (f: Folder, depth: number): React.ReactNode => {
    const isOpen = expanded.has(f.id);
    const childFolders = foldersByParent.get(f.id) ?? [];
    const childNotes = notesByFolder.get(f.id) ?? [];
    const hasChildren = childFolders.length > 0 || childNotes.length > 0;
    const isEditing = editing?.kind === "folder" && editing.id === f.id;
    const isAddingHere = addingFolderIn === f.id;

    return (
      <div key={f.id}>
        <div
          className={cn("nb-row nb-row-folder", isEditing && "is-editing")}
          style={{ paddingLeft: 8 + depth * 16 }}
          onClick={() => toggleFolder(f.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") toggleFolder(f.id);
          }}
          onContextMenu={(e) => openCtx(e, "folder", f.id)}
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          aria-label={`Папка ${f.name}`}
        >
          <span className={cn("nb-row-chevron", isOpen && "is-open")} aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
          <span className="nb-row-ico nb-row-ico-folder" aria-hidden="true">
            {isOpen ? <FolderOpen className="h-4 w-4" /> : <FolderIcon className="h-4 w-4" />}
          </span>
          {isEditing ? (
            <input
              autoFocus
              className="nb-row-rename"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") void commitRename();
                if (e.key === "Escape") setEditing(null);
              }}
              onBlur={() => void commitRename()}
              aria-label="Новое имя папки"
            />
          ) : (
            <span className="nb-row-title">{f.name}</span>
          )}
        </div>

        {/* Дети папки — заметки и вложенные папки */}
        {isOpen && (
          <div className="nb-branch">
            {isAddingHere && (
              <div className="nb-row nb-row-new" style={{ paddingLeft: 8 + (depth + 1) * 16 }}>
                <FolderIcon className="nb-row-ico h-4 w-4 text-[#d99a2b]" aria-hidden="true" />
                <input
                  autoFocus
                  className="nb-row-rename"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void commitCreateFolder();
                    if (e.key === "Escape") {
                      setAddingFolderIn(null);
                      setNewFolderName("");
                    }
                  }}
                  onBlur={() => void commitCreateFolder()}
                  placeholder="Имя вложенной папки"
                  aria-label="Имя вложенной папки"
                />
              </div>
            )}
            {childFolders.map((cf) => folderRow(cf, depth + 1))}
            {childNotes.map((n) => noteRow(n, depth + 1))}
            {!hasChildren && !isAddingHere && (
              <p className="nb-branch-empty" style={{ paddingLeft: 8 + (depth + 1) * 16 }}>
                пусто — правый клик добавит заметку или папку
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const noteRow = (n: Note, depth: number): React.ReactNode => {
    const isEditing = editing?.kind === "note" && editing.id === n.id;
    return (
      <div
        key={n.id}
        className={cn("nb-row nb-row-note", activeNoteId === n.id && "is-active", isEditing && "is-editing")}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={() => {
          expandParents(n.folderId);
          openNote(n.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            expandParents(n.folderId);
            openNote(n.id);
          }
        }}
        onContextMenu={(e) => openCtx(e, "note", n.id)}
        role="button"
        tabIndex={0}
        aria-label={`Открыть заметку ${n.title}`}
      >
        <span className="nb-row-ico nb-row-ico-note" aria-hidden="true">
          <FileText className="h-4 w-4" />
        </span>
        {isEditing ? (
          <input
            autoFocus
            className="nb-row-rename"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commitRename();
              if (e.key === "Escape") setEditing(null);
            }}
            onBlur={() => void commitRename()}
            aria-label="Новое название заметки"
          />
        ) : (
          <span className="nb-row-title">{n.title}</span>
        )}
        <button
          type="button"
          className={cn("nb-row-star", n.starred && "is-on")}
          onClick={(e) => {
            e.stopPropagation();
            toggleStar(n.id);
          }}
          aria-label={n.starred ? "Убрать из избранного" : "В избранное"}
          title={n.starred ? "Убрать из избранного" : "В избранное"}
        >
          <Star className={cn("h-3.5 w-3.5", n.starred && "fill-current")} />
        </button>
      </div>
    );
  };

  const rootFolders = foldersByParent.get(null) ?? [];
  const rootNotes = notesByFolder.get(null) ?? [];

  const ctxNote = ctx?.kind === "note" ? notes.find((n) => n.id === ctx.id) : null;
  const ctxFolder = ctx?.kind === "folder" ? folders.find((f) => f.id === ctx.id) : null;

  return (
    <aside className="nb-sidebar" aria-label="Структура заметок">
      {/* Поиск */}
      <div className="nb-search">
        <Search className="h-4 w-4 opacity-50" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по заметкам…"
          aria-label="Поиск по заметкам"
        />
        {search && (
          <button type="button" onClick={() => setSearch("")} aria-label="Очистить поиск">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Создание: две понятные кнопки — заметка и папка */}
      <div className="grid grid-cols-2 gap-2 px-3 pt-3">
        <button
          type="button"
          className="nb-primary-btn"
          onClick={() => void handleCreateNote()}
          title={
            currentFolderName
              ? `Новая заметка появится в папке «${currentFolderName}»`
              : "Новая заметка появится без папки"
          }
          aria-label="Создать заметку в текущей папке"
        >
          <Plus className="h-4 w-4" /> Заметка
        </button>
        <button
          type="button"
          className="nb-ghost-btn"
          onClick={() => {
            setAddingFolderIn("root-folder");
            setNewFolderName("");
          }}
          aria-label="Создать папку"
        >
          <FolderPlus className="h-4 w-4" /> Папка
        </button>
      </div>

      {/* Единая область структуры */}
      <div className="nb-scroll nb-tree mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {/* Избранное — сворачиваемый раздел со звёздами */}
        {favorites.length > 0 && (
          <section className="nb-tree-section">
            <button
              type="button"
              className="nb-tree-head"
              onClick={() => setFavOpen((v) => !v)}
              aria-expanded={favOpen}
            >
              <span className={cn("nb-row-chevron", favOpen && "is-open")} aria-hidden="true">
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
              <Star className="h-4 w-4 text-[#db3996] fill-current" aria-hidden="true" />
              <span className="nb-tree-head-title">Избранное</span>
              <span className="nb-tree-head-count">{favorites.length}</span>
            </button>
            {favOpen && <div className="nb-branch">{favorites.map((n) => noteRow(n, 0))}</div>}
          </section>
        )}

        {/* Дерево файлов: папки и заметки с обычной вложенностью */}
        <section className="nb-tree-section">
          <p className="nb-tree-head nb-tree-head-static">
            <FolderIcon className="h-4 w-4 text-[#d99a2b]" aria-hidden="true" />
            <span className="nb-tree-head-title">Все файлы</span>
          </p>

          {addingFolderIn === "root-folder" && (
            <div className="nb-row nb-row-new" style={{ paddingLeft: 8 }}>
              <FolderIcon className="nb-row-ico h-4 w-4 text-[#d99a2b]" aria-hidden="true" />
              <input
                autoFocus
                className="nb-row-rename"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void commitCreateFolder();
                  if (e.key === "Escape") {
                    setAddingFolderIn(null);
                    setNewFolderName("");
                  }
                }}
                onBlur={() => void commitCreateFolder()}
                placeholder="Имя папки"
                aria-label="Имя новой папки"
              />
            </div>
          )}

          {filtering ? (
            /* При поиске или фильтре по тегу дерево уступает место результатам */
            <div>
              {matchedNotes.length === 0 && (
                <p className="nb-empty">Ничего не нашлось — попробуй другой запрос.</p>
              )}
              {matchedNotes.map((n) => noteRow(n, 0))}
            </div>
          ) : (
            <div>
              {rootFolders.map((f) => folderRow(f, 0))}
              {rootNotes.map((n) => noteRow(n, 0))}
              {rootFolders.length === 0 && rootNotes.length === 0 && addingFolderIn !== "root-folder" && (
                <p className="nb-empty">
                  Пока пусто. Нажми «Заметка» или «Папка» — и здесь появится первое имя.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Вложения */}
        {attachments.length > 0 && (
          <section className="nb-tree-section">
            <p className="nb-tree-head nb-tree-head-static">
              <Paperclip className="h-4 w-4" aria-hidden="true" />
              <span className="nb-tree-head-title">Вложения</span>
              <span className="nb-tree-head-count">{attachments.length}</span>
            </p>
            <div className="nb-branch">
              {attachments.slice(0, 12).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="nb-row nb-row-note w-full"
                  onClick={() => openAttachment(a.id)}
                  aria-label={`Открыть вложение ${a.name}`}
                >
                  <span className="nb-row-ico nb-row-ico-note" aria-hidden="true">
                    <Paperclip className="h-4 w-4" />
                  </span>
                  <span className="nb-row-title">{a.name}</span>
                  <span className="nb-tree-head-count">{Math.max(1, Math.round(a.size / 1024))} КБ</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Корзина */}
        <section className="nb-tree-section">
          <button
            type="button"
            className="nb-tree-head w-full"
            onClick={() => setTrashOpen((v) => !v)}
            aria-expanded={trashOpen}
          >
            <span className={cn("nb-row-chevron", trashOpen && "is-open")} aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="nb-tree-head-title">Корзина</span>
            <span className="nb-tree-head-count">{trashed.length}</span>
          </button>
          {trashOpen && (
            <div className="nb-branch">
              {trashed.length === 0 && <p className="nb-empty">Корзина чиста.</p>}
              {trashed.map((n) => (
                <div key={n.id} className="nb-row nb-row-note">
                  <span className="nb-row-ico nb-row-ico-note" aria-hidden="true">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="nb-row-title">{n.title}</span>
                  <span className="nb-row-star">
                    <button
                      type="button"
                      className="nb-row-star"
                      onClick={() => restoreNote(n.id)}
                      aria-label="Вернуть заметку"
                      title="Вернуть"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="nb-row-star is-danger"
                      onClick={() => {
                        if (!confirmDelete) {
                          deleteNoteForever(n.id);
                          return;
                        }
                        if (window.confirm(`«${n.title}» удалится навсегда. Точно?`)) deleteNoteForever(n.id);
                      }}
                      aria-label="Удалить навсегда"
                      title="Удалить навсегда"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Карточка пользователя: настройки и выход — на видном месте */}
      <div className="nb-user">
        <span
          className="user-chip-avatar"
          style={{ backgroundColor: user ? avatarColor(user.email) : "#0593c6" }}
          aria-hidden="true"
        >
          {user ? (user.name ?? user.email)[0].toUpperCase() : "M"}
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{user?.name ?? "Без имени"}</span>
          <span className="block truncate text-[11px] text-[color:var(--nb-faint)]">{user?.email}</span>
        </div>
        <button
          type="button"
          className="nb-item-act"
          onClick={() => setSettingsOpen(true)}
          aria-label="Настройки блокнота"
          title="Настройки"
        >
          <Settings className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="nb-item-act"
          onClick={() => {
            onLogout();
            setSidebar(false);
          }}
          aria-label="Выйти из аккаунта"
          title="Выйти"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* Контекстное меню правого клика: минимальные иконки, только нужные действия */}
      {ctx && (ctxNote || ctxFolder) && (
        <div
          ref={ctxRef}
          className="nb-ctx"
          role="menu"
          aria-label="Действия с файлом"
          style={{
            left: Math.min(ctx.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 232),
            top: Math.min(ctx.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 190),
          }}
        >
          {ctxNote && (
            <>
              <button
                type="button"
                className="nb-ctx-item"
                onClick={() => {
                  void duplicateNote(ctxNote.id).then((copy) => {
                    if (copy) toast.success("Копия создана");
                  });
                  setCtx(null);
                }}
                role="menuitem"
              >
                <Copy className="h-3.5 w-3.5" /> Создать копию
              </button>
              <button
                type="button"
                className="nb-ctx-item"
                onClick={() => {
                  toggleStar(ctxNote.id);
                  setCtx(null);
                }}
                role="menuitem"
              >
                <Star className={cn("h-3.5 w-3.5", ctxNote.starred && "fill-current")} />
                {ctxNote.starred ? "Убрать из избранного" : "Добавить в избранное"}
              </button>
              <button
                type="button"
                className="nb-ctx-item"
                onClick={() => startRename("note", ctxNote.id, ctxNote.title)}
                role="menuitem"
              >
                <Pencil className="h-3.5 w-3.5" /> Переименовать
              </button>
              <button
                type="button"
                className="nb-ctx-item is-danger"
                onClick={() => askDeleteNote(ctxNote)}
                role="menuitem"
              >
                <Trash2 className="h-3.5 w-3.5" /> Удалить
              </button>
            </>
          )}
          {ctxFolder && (
            <>
              <button
                type="button"
                className="nb-ctx-item"
                onClick={() => {
                  setCtx(null);
                  expandParents(ctxFolder.id);
                  void createNote(ctxFolder.id);
                }}
                role="menuitem"
              >
                <FilePlus2 className="h-3.5 w-3.5" /> Новая заметка внутри
              </button>
              <button
                type="button"
                className="nb-ctx-item"
                onClick={() => {
                  setCtx(null);
                  expandParents(ctxFolder.id);
                  setAddingFolderIn(ctxFolder.id);
                  setNewFolderName("");
                }}
                role="menuitem"
              >
                <FolderPlus className="h-3.5 w-3.5" /> Новая папка внутри
              </button>
              <button
                type="button"
                className="nb-ctx-item"
                onClick={() => startRename("folder", ctxFolder.id, ctxFolder.name)}
                role="menuitem"
              >
                <Pencil className="h-3.5 w-3.5" /> Переименовать
              </button>
              <button
                type="button"
                className="nb-ctx-item is-danger"
                onClick={() => askDeleteFolder(ctxFolder)}
                role="menuitem"
              >
                <Trash2 className="h-3.5 w-3.5" /> Удалить
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
