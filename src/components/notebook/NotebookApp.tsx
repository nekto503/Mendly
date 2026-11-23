"use client";

import { useEffect, useMemo, useRef } from "react";
import { NotebookPen } from "lucide-react";
import { TextEffect } from "@/components/core/text-effect";
import { useNotebook } from "./store";
import { bgImageUrl, useSettings } from "./settings";
import TabBar from "./TabBar";
import Sidebar from "./Sidebar";
import NoteWorkarea from "./NoteWorkarea";
import AttachmentView from "./AttachmentView";
import GraphView from "./GraphView";
import AttachmentsModal from "./AttachmentsModal";
import SettingsModal from "./SettingsModal";
import type { PublicUser } from "./types";

// Пустая рабочая область: ни одной открытой вкладки
function EmptyState() {
  const createNote = useNotebook((s) => s.createNote);
  const setGraph = useNotebook((s) => s.setGraph);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-8 text-center">
      <div className="nb-logo mx-auto opacity-70">
        <NotebookPen className="h-5 w-5" />
      </div>
      <h2 className="font-display text-3xl font-bold" style={{ color: "var(--nb-text)" }}>
        <TextEffect per="char" preset="blur" duration={0.4}>
          Место готово к мыслям
        </TextEffect>
      </h2>
      <p className="max-w-[44ch] text-sm leading-relaxed" style={{ color: "var(--nb-muted)" }}>
        Открой заметку в дереве слева или создай новую кнопкой «Заметка». Правый клик по файлу —
        копия, избранное, переименование. Граф связей — кнопка «Граф» сверху.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" className="btn btn-flame" onClick={() => createNote(null)}>
          Новая заметка
        </button>
        <button type="button" className="btn btn-ghost-inv" onClick={() => setGraph(true)}>
          Граф связей
        </button>
      </div>
    </div>
  );
}

type Props = {
  user: PublicUser;
  onLogout: () => Promise<void> | void;
};

// Блокнот MINDLY: светлый дружелюбный интерфейс, дерево файлов, вкладки открытых
// заметок, редактор markdown и граф связей отдельным разделом.
// Без аккаунта сюда не попасть — AppShell перебрасывает на страницу входа.
export default function NotebookApp({ user, onLogout }: Props) {
  const loading = useNotebook((s) => s.loading);
  const notes = useNotebook((s) => s.notes);
  const attachments = useNotebook((s) => s.attachments);
  const tabs = useNotebook((s) => s.tabs);
  const activeKey = useNotebook((s) => s.activeKey);
  const graphOpen = useNotebook((s) => s.graphOpen);
  const refresh = useNotebook((s) => s.refresh);

  const settings = useSettings((s) => s.settings);
  const loadSettings = useSettings((s) => s.load);
  const resetSettings = useSettings((s) => s.reset);

  const rootRef = useRef<HTMLDivElement>(null);

  /* Загрузка данных и настроек при входе */
  useEffect(() => {
    loadSettings(user.id);
    useNotebook.getState().init(user);
    return () => resetSettings();
  }, [user, loadSettings, resetSettings]);

  /* Настройки применяются к интерфейсу через data-атрибуты и CSS-переменные */
  const bgUrl = useMemo(() => bgImageUrl(settings.bgImage), [settings.bgImage]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.dataset.theme = settings.theme;
    root.dataset.glass = settings.glass ? "on" : "off";
    root.dataset.readable = settings.readableWidth ? "on" : "off";
    if (settings.bgImage === "none" || !bgUrl) {
      delete root.dataset.bg;
      root.style.removeProperty("--nb-bg-img");
    } else {
      root.dataset.bg = settings.bgImage;
      root.style.setProperty("--nb-bg-img", `url(${bgUrl})`);
    }
    root.style.setProperty("--flame", settings.accent);
    root.style.setProperty("--nb-editor-size", `${settings.editorFontSize}px`);
    root.style.setProperty("--nb-editor-lh", String(settings.editorLineHeight));
    // Переменные темы на html — чтобы доходили до порталов Radix (шторка, меню)
    const html = document.documentElement;
    html.dataset.nbTheme = settings.theme;
    html.style.setProperty("--flame", settings.accent);
    // Режим по умолчанию из настроек
    useNotebook.getState().setMode(settings.defaultMode);
    return () => {
      delete html.dataset.nbTheme;
      html.style.removeProperty("--flame");
    };
  }, [settings, bgUrl]);

  /* Фоновая синхронизация: поллинг по интервалу из настроек и обновление по фокусу окна */
  const syncInterval = settings.syncInterval;
  const syncOnFocus = settings.syncOnFocus;
  useEffect(() => {
    const timer = syncInterval > 0 ? window.setInterval(() => refresh(), syncInterval * 1000) : null;
    const onFocus = () => syncOnFocus && refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      if (timer) window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [syncInterval, syncOnFocus, refresh]);

  const activeTab = tabs.find((t) => t.key === activeKey) ?? null;
  const activeNote =
    activeTab?.kind === "note" && activeTab.id ? notes.find((n) => n.id === activeTab.id) : null;

  const goSite = () => {
    window.location.hash = "#/";
  };

  // Выход: чистим сессию в шелле и открываем окно входа поверх сайта
  // (после повторного входа пользователь вернётся в блокнот)
  const handleLogout = async () => {
    await onLogout();
    if (window.location.hash.startsWith("#/notebook")) {
      window.location.hash = "#/auth/login";
    }
  };

  return (
    <div
      ref={rootRef}
      className="nb-root relative flex h-[100dvh] flex-col"
      data-lenis-prevent="true"
    >
      <TabBar user={user} onGoSite={goSite} onLogout={handleLogout} />

      <div className="relative z-[1] flex min-h-0 flex-1">
        {/* Дерево файлов слева */}
        <Sidebar onLogout={handleLogout} />

        {/* Рабочая область: либо раздел графа, либо вкладки файлов */}
        <main className="min-w-0 flex-1">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <span className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: "var(--nb-muted)" }}>
                открываю блокнот…
              </span>
            </div>
          ) : graphOpen ? (
            <GraphView />
          ) : activeTab?.kind === "note" && activeNote && !activeNote.trashed ? (
            <NoteWorkarea key={activeNote.id} note={activeNote} />
          ) : activeTab?.kind === "attachment" && activeTab.id && attachments.some((a) => a.id === activeTab.id) ? (
            <AttachmentView id={activeTab.id} />
          ) : (
            <EmptyState />
          )}
        </main>
      </div>

      <AttachmentsModal />
      <SettingsModal />
    </div>
  );
}
