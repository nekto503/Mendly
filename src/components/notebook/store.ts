"use client";

// Стор блокнота: сервер — источник истины, локальные правки живут до автосохранения

import { create } from "zustand";
import {
  apiLogout,
  createAttachmentRequest,
  createFolderRequest,
  createNoteRequest,
  deleteAttachmentRequest,
  deleteFolderRequest,
  deleteNoteRequest,
  fetchAttachments,
  fetchFolders,
  fetchNotes,
  patchFolderRequest,
  patchNote,
} from "./api";
import type {
  Attachment,
  EditorMode,
  Folder,
  NewAttachmentInput,
  Note,
  OpenTab,
  PublicUser,
} from "./types";

export const tabKey = (kind: OpenTab["kind"], id: string) => `${kind}:${id}`;

function upsertTab(tabs: OpenTab[], tab: OpenTab): OpenTab[] {
  const exists = tabs.find((t) => t.key === tab.key);
  if (exists) return tabs;
  return [...tabs, tab];
}

type NotebookState = {
  user: PublicUser | null;
  notes: Note[];
  folders: Folder[];
  attachments: Attachment[];

  tabs: OpenTab[];
  activeKey: string | null;

  // Раздел «Граф» — не вкладка, а отдельный экран поверх вкладок
  graphOpen: boolean;

  mode: EditorMode;
  search: string;
  attachModalOpen: boolean;
  sidebarOpen: boolean; // мобильный сайдбар
  saving: boolean;
  lastSynced: number | null;
  loading: boolean;

  init: (user: PublicUser) => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;

  openNote: (id: string) => void;
  openAttachment: (id: string) => void;
  closeTab: (key: string) => void;
  setActive: (key: string) => void;
  setGraph: (v: boolean) => void;

  setMode: (m: EditorMode) => void;
  setSearch: (s: string) => void;
  setAttachModal: (v: boolean) => void;
  setSidebar: (v: boolean) => void;

  updateLocalNote: (id: string, patch: Partial<Note>) => void;
  persistNote: (id: string, patch?: Partial<Note>) => Promise<void>;
  createNote: (folderId?: string | null) => Promise<Note | null>;
  duplicateNote: (id: string) => Promise<Note | null>;
  toggleStar: (id: string) => Promise<void>;
  trashNote: (id: string) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  deleteNoteForever: (id: string) => Promise<void>;

  createFolder: (name: string, parentId?: string | null) => Promise<Folder | null>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;

  createAttachment: (input: NewAttachmentInput) => Promise<Attachment | null>;
  deleteAttachment: (id: string) => Promise<void>;

  logout: () => Promise<void>;
};

export const useNotebook = create<NotebookState>((set, get) => ({
  user: null,
  notes: [],
  folders: [],
  attachments: [],
  tabs: [],
  activeKey: null,
  graphOpen: false,
  mode: "edit",
  search: "",
  attachModalOpen: false,
  sidebarOpen: false,
  saving: false,
  lastSynced: null,
  loading: false,

  init: async (user) => {
    set({ user, loading: true });
    await get().refresh();
    set({ loading: false });
  },

  refresh: async () => {
    try {
      const [notes, folders, attachments] = await Promise.all([
        fetchNotes(),
        fetchFolders(),
        fetchAttachments(),
      ]);
      const prev = get();
      // Если открытая заметка исчезла на сервере — закрываем её вкладку
      const alive = (t: OpenTab) => {
        if (t.kind === "note") return notes.some((n) => n.id === t.id);
        return attachments.some((a) => a.id === t.id);
      };
      const tabs = prev.tabs.filter(alive);
      set({
        notes,
        folders,
        attachments,
        tabs,
        activeKey: tabs.some((t) => t.key === prev.activeKey) ? prev.activeKey : (tabs[tabs.length - 1]?.key ?? null),
        lastSynced: Date.now(),
      });
    } catch {
      // сеть моргнула — оставляем как есть, повторит поллинг
    }
  },

  reset: () => {
    set({
      user: null,
      notes: [],
      folders: [],
      attachments: [],
      tabs: [],
      activeKey: null,
      graphOpen: false,
      attachModalOpen: false,
      sidebarOpen: false,
      saving: false,
      lastSynced: null,
      loading: false,
      search: "",
    });
  },

  openNote: (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const key = tabKey("note", id);
    set({
      tabs: upsertTab(get().tabs, { key, kind: "note", id, title: note.title }),
      activeKey: key,
      graphOpen: false,
      sidebarOpen: false,
    });
  },

  openAttachment: (id) => {
    const att = get().attachments.find((a) => a.id === id);
    if (!att) return;
    const key = tabKey("attachment", id);
    set({
      tabs: upsertTab(get().tabs, { key, kind: "attachment", id, title: att.name }),
      activeKey: key,
      graphOpen: false,
      sidebarOpen: false,
    });
  },

  closeTab: (key) => {
    const tabs = get().tabs.filter((t) => t.key !== key);
    let activeKey = get().activeKey;
    if (activeKey === key) activeKey = tabs[tabs.length - 1]?.key ?? null;
    set({ tabs, activeKey });
  },

  setActive: (key) => set({ activeKey: key, graphOpen: false }),
  setGraph: (graphOpen) => set({ graphOpen }),

  setMode: (mode) => set({ mode }),
  setSearch: (search) => set({ search }),
  setAttachModal: (attachModalOpen) => set({ attachModalOpen }),
  setSidebar: (sidebarOpen) => set({ sidebarOpen }),

  // Локальная правка (мгновенная, без запроса) — текст редактора так печатает
  updateLocalNote: (id, patch) => {
    set({
      notes: get().notes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      tabs: get().tabs.map((t) =>
        t.kind === "note" && t.id === id && patch.title ? { ...t, title: patch.title } : t
      ),
    });
  },

  // Автосохранение на сервер
  persistNote: async (id, patch) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    set({ saving: true });
    try {
      const saved = await patchNote(id, {
        title: note.title,
        content: note.content,
        folderId: note.folderId,
        ...(patch ?? {}),
      });
      set({
        notes: get().notes.map((n) =>
          n.id === id ? { ...saved, // серверное updatedAt точнее
          } : n
        ),
        saving: false,
        lastSynced: Date.now(),
      });
    } catch {
      set({ saving: false });
    }
  },

  createNote: async (folderId) => {
    try {
      const note = await createNoteRequest("Новая заметка", folderId ?? null);
      set({ notes: [note, ...get().notes], lastSynced: Date.now() });
      get().openNote(note.id);
      return note;
    } catch {
      return null;
    }
  },

  // Создать копию заметки: тот же текст и папка, звезда не переносится
  duplicateNote: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return null;
    try {
      const copy = await createNoteRequest(`${note.title} — копия`, note.folderId, {
        content: note.content,
      });
      set({ notes: [copy, ...get().notes], lastSynced: Date.now() });
      get().openNote(copy.id);
      return copy;
    } catch {
      return null;
    }
  },

  toggleStar: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const starred = !note.starred;
    set({ notes: get().notes.map((n) => (n.id === id ? { ...n, starred } : n)) });
    try {
      await patchNote(id, { starred });
      set({ lastSynced: Date.now() });
    } catch {
      set({ notes: get().notes.map((n) => (n.id === id ? { ...n, starred: !starred } : n)) });
    }
  },

  trashNote: async (id) => {
    // Локально прячем и закрываем вкладку, потом сервер
    const tabs = get().tabs.filter((t) => !(t.kind === "note" && t.id === id));
    set({
      notes: get().notes.map((n) => (n.id === id ? { ...n, trashed: true } : n)),
      tabs,
      activeKey: get().activeKey && tabs.some((t) => t.key === get().activeKey) ? get().activeKey : (tabs[tabs.length - 1]?.key ?? null),
    });
    try {
      await patchNote(id, { trashed: true });
      set({ lastSynced: Date.now() });
    } catch {
      /* повторит refresh */
    }
  },

  restoreNote: async (id) => {
    set({ notes: get().notes.map((n) => (n.id === id ? { ...n, trashed: false } : n)) });
    try {
      await patchNote(id, { trashed: false });
      set({ lastSynced: Date.now() });
    } catch {
      /* повторит refresh */
    }
  },

  deleteNoteForever: async (id) => {
    set({
      notes: get().notes.filter((n) => n.id !== id),
      tabs: get().tabs.filter((t) => !(t.kind === "note" && t.id === id)),
    });
    try {
      await deleteNoteRequest(id);
      set({ lastSynced: Date.now() });
    } catch {
      get().refresh();
    }
  },

  createFolder: async (name, parentId = null) => {
    try {
      const folder = await createFolderRequest(name, parentId ?? null);
      set({ folders: [...get().folders, folder], lastSynced: Date.now() });
      return folder;
    } catch (e) {
      throw e;
    }
  },

  renameFolder: async (id, name) => {
    set({ folders: get().folders.map((f) => (f.id === id ? { ...f, name } : f)) });
    try {
      await patchFolderRequest(id, name);
      set({ lastSynced: Date.now() });
    } catch {
      get().refresh();
    }
  },

  // Папка уходит вместе с вложенными папками — сервер возвращает истину,
  // клиент просто забирает свежий список
  deleteFolder: async (id) => {
    try {
      await deleteFolderRequest(id);
      await get().refresh();
    } catch {
      get().refresh();
    }
  },

  createAttachment: async (input) => {
    try {
      const attachment = await createAttachmentRequest(input);
      set({ attachments: [attachment, ...get().attachments], lastSynced: Date.now() });
      // Привязали к заметке — обновим её список вложений локально
      if (input.noteId) {
        set({
          notes: get().notes.map((n) =>
            n.id === input.noteId
              ? { ...n, attachments: [...n.attachments, { id: attachment.id, name: attachment.name, mime: attachment.mime, size: attachment.size }] }
              : n
          ),
        });
      }
      return attachment;
    } catch (e) {
      throw e;
    }
  },

  deleteAttachment: async (id) => {
    set({
      attachments: get().attachments.filter((a) => a.id !== id),
      notes: get().notes.map((n) => ({ ...n, attachments: n.attachments.filter((a) => a.id !== id) })),
      tabs: get().tabs.filter((t) => !(t.kind === "attachment" && t.id === id)),
    });
    try {
      await deleteAttachmentRequest(id);
      set({ lastSynced: Date.now() });
    } catch {
      get().refresh();
    }
  },

  logout: async () => {
    try {
      await apiLogout();
    } catch {
      /* cookie всё равно чистится */
    }
    get().reset();
  },
}));

/* ---------- события в редактор (вставка текста, экспорт PDF) ---------- */

// Вставить текст в открытый редактор в позицию курсора
export function editorInsert(text: string) {
  window.dispatchEvent(new CustomEvent<string>("mindly:editor-insert", { detail: text }));
}

// Попросить редактор экспортировать активную заметку в PDF
export function exportActiveNote() {
  window.dispatchEvent(new CustomEvent("mindly:export-active-note"));
}

/* ---------- вычисляемые хелперы ---------- */

// Заметки, ссылающиеся на данную через [[заголовок]]
export function backlinksFor(note: Note, notes: Note[]): Note[] {
  if (!note || note.trashed) return [];
  const target = note.title.toLowerCase();
  return notes.filter(
    (n) => !n.trashed && n.id !== note.id && n.content.toLowerCase().includes(`[[${target}]]`)
  );
}

// Ссылки [[...]] в тексте (вне кода) в нижнем регистре
export function extractLinks(content: string): string[] {
  const withoutCode = content.replace(/```[\s\S]*?```/g, " ");
  const found = withoutCode.matchAll(/\[\[([^\]\n]+)\]\]/g);
  return [...found].map((m) => m[1].trim().toLowerCase());
}

export type GraphNode = { id: string; title: string; degree: number };
export type GraphLink = { source: string; target: string };

// Граф связей: узлы — заметки, рёбра — [[вики-ссылки]]
export function buildGraph(notes: Note[]): { nodes: GraphNode[]; links: GraphLink[] } {
  const live = notes.filter((n) => !n.trashed);
  const byTitle = new Map(live.map((n) => [n.title.toLowerCase(), n]));
  const degree = new Map<string, number>(live.map((n) => [n.id, 0]));
  const links: GraphLink[] = [];
  const seen = new Set<string>();

  for (const note of live) {
    for (const link of extractLinks(note.content)) {
      const target = byTitle.get(link);
      if (!target || target.id === note.id) continue;
      const key = [note.id, target.id].sort().join("→");
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ source: note.id, target: target.id });
      degree.set(note.id, (degree.get(note.id) ?? 0) + 1);
      degree.set(target.id, (degree.get(target.id) ?? 0) + 1);
    }
  }

  const nodes: GraphNode[] = live.map((n) => ({ id: n.id, title: n.title, degree: degree.get(n.id) ?? 0 }));
  return { nodes, links };
}

// Русские склонения для счётчиков
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const d10 = n % 10;
  const d100 = n % 100;
  if (d10 === 1 && d100 !== 11) return one;
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return few;
  return many;
}
