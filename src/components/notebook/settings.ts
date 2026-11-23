"use client";

// Настройки блокнота — как в Obsidian: всё, что можно сменить, меняется.
// Хранятся в localStorage по пользователю, применяются к интерфейсу через data-атрибуты и CSS-переменные.

import { create } from "zustand";
import type { EditorMode } from "./types";

export type NbTheme = "deep" | "light";
export type NbBgImage = "none" | "field" | "glass" | "rose" | "wall";

export type NotebookSettings = {
  // Внешний вид
  theme: NbTheme; // тёмная «глубина» или светлая «бумага»
  accent: string; // акцентный цвет интерфейса блокнота
  glass: boolean; // стеклянные панели с blur
  bgImage: NbBgImage; // едва заметный фотоподложка под интерфейсом
  // Редактор
  defaultMode: EditorMode; // режим по умолчанию для новых вкладок
  editorFontSize: number; // 12–22
  editorLineHeight: number; // 1.4–2.2
  spellcheck: boolean; // проверка орфографии
  showWordCount: boolean; // счётчик слов на панели инструментов
  readableWidth: boolean; // ограничивать ширину строки в режиме чтения
  // Файлы и ссылки
  confirmDelete: boolean; // спрашивать подтверждение перед удалением
  // Синхронизация
  syncInterval: number; // секунд между фоновыми обновлениями; 0 — выключить
  syncOnFocus: boolean; // обновлять при возврате во вкладку
};

export const DEFAULT_SETTINGS: NotebookSettings = {
  // Блокнот по умолчанию светлый — «бумага»: дружелюбнее для новых пользователей;
  // тёмная «глубина» остаётся доступной в настройках внешнего вида
  theme: "light",
  accent: "#db3996",
  glass: true,
  bgImage: "none",
  defaultMode: "edit",
  editorFontSize: 13.5,
  editorLineHeight: 1.75,
  spellcheck: false,
  showWordCount: true,
  readableWidth: true,
  confirmDelete: true,
  syncInterval: 30,
  syncOnFocus: true,
};

// Доступные акценты — палитра MINDLY плюс пара родственных оттенков
export const ACCENTS: { value: string; label: string }[] = [
  { value: "#db3996", label: "пламя" },
  { value: "#0593c6", label: "прибой" },
  { value: "#c0392b", label: "киноварь" },
  { value: "#7d5ba6", label: "ирис" },
  { value: "#2e8b57", label: "морская пена" },
];

export const BG_IMAGES: { value: NbBgImage; label: string; url: string }[] = [
  { value: "none", label: "без фона", url: "" },
  { value: "field", label: "поле", url: "/images/field.jpg" },
  { value: "glass", label: "стекло", url: "/images/glass.jpg" },
  { value: "rose", label: "роза", url: "/images/rose.jpg" },
  { value: "wall", label: "стена", url: "/images/wall.jpg" },
];

const storageKey = (userId: string) => `mindly:settings:${userId}`;

function sanitize(raw: unknown): NotebookSettings {
  const src = (raw ?? {}) as Partial<NotebookSettings>;
  const num = (v: unknown, min: number, max: number, fallback: number) => {
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  const modes: EditorMode[] = ["edit", "read"];
  return {
    // Без сохранённых настроек блокнот всегда открывается светлым — «бумага»
    theme: src.theme === "light" ? "light" : src.theme === "deep" ? "deep" : "light",
    accent: typeof src.accent === "string" && /^#[0-9a-fA-F]{3,8}$/.test(src.accent) ? src.accent : DEFAULT_SETTINGS.accent,
    glass: typeof src.glass === "boolean" ? src.glass : DEFAULT_SETTINGS.glass,
    bgImage: BG_IMAGES.some((b) => b.value === src.bgImage) ? (src.bgImage as NbBgImage) : "none",
    defaultMode: modes.includes(src.defaultMode as EditorMode) ? (src.defaultMode as EditorMode) : DEFAULT_SETTINGS.defaultMode,
    editorFontSize: num(src.editorFontSize, 12, 22, DEFAULT_SETTINGS.editorFontSize),
    editorLineHeight: num(src.editorLineHeight, 1.4, 2.2, DEFAULT_SETTINGS.editorLineHeight),
    spellcheck: typeof src.spellcheck === "boolean" ? src.spellcheck : DEFAULT_SETTINGS.spellcheck,
    showWordCount: typeof src.showWordCount === "boolean" ? src.showWordCount : DEFAULT_SETTINGS.showWordCount,
    readableWidth: typeof src.readableWidth === "boolean" ? src.readableWidth : DEFAULT_SETTINGS.readableWidth,
    confirmDelete: typeof src.confirmDelete === "boolean" ? src.confirmDelete : DEFAULT_SETTINGS.confirmDelete,
    syncInterval: num(src.syncInterval, 0, 120, DEFAULT_SETTINGS.syncInterval),
    syncOnFocus: typeof src.syncOnFocus === "boolean" ? src.syncOnFocus : DEFAULT_SETTINGS.syncOnFocus,
  };
}

type SettingsState = {
  settings: NotebookSettings;
  settingsOpen: boolean;
  loadedFor: string | null;
  load: (userId: string) => void;
  update: (patch: Partial<NotebookSettings>) => void;
  reset: () => void;
  setOpen: (v: boolean) => void;
};

export const useSettings = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  settingsOpen: false,
  loadedFor: null,

  load: (userId) => {
    if (get().loadedFor === userId) return;
    let parsed: unknown = null;
    try {
      const raw = window.localStorage.getItem(storageKey(userId));
      parsed = raw ? (JSON.parse(raw) as unknown) : null;
    } catch {
      parsed = null;
    }
    set({ settings: sanitize(parsed), loadedFor: userId });
  },

  update: (patch) => {
    const next = sanitize({ ...get().settings, ...patch });
    set({ settings: next });
    try {
      const key = get().loadedFor ? storageKey(get().loadedFor!) : "mindly:settings";
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* приватный режим — настройки живут до перезагрузки */
    }
  },

  reset: () => {
    set({ settings: DEFAULT_SETTINGS, settingsOpen: false, loadedFor: null });
  },

  setOpen: (settingsOpen) => set({ settingsOpen }),
}));

// URL фоновой подложки для data-атрибута
export function bgImageUrl(value: NbBgImage): string {
  return BG_IMAGES.find((b) => b.value === value)?.url ?? "";
}
