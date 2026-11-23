"use client";

// Настройки блокнота: слева разделы, справа содержание — как в Obsidian.
// Всё, что можно сменить, меняется: тема, акцент, стекло, фон, редактор,
// файлы и ссылки, синхронизация. Раздел хоткеев показывает текущие привязки.

import { useEffect, useState } from "react";
import {
  Check,
  FileDown,
  FolderCog,
  Info,
  Keyboard,
  Link2,
  Palette,
  RefreshCw,
  SlidersHorizontal,
  SquarePen,
  X,
} from "lucide-react";
import { ACCENTS, BG_IMAGES, useSettings, type NbTheme } from "./settings";
import { useNotebook } from "./store";
import { pluralRu } from "./store";
import { cn } from "@/lib/utils";

type SectionKey = "appearance" | "editor" | "files" | "hotkeys" | "sync" | "about";

const SECTIONS: { key: SectionKey; label: string; icon: typeof Palette }[] = [
  { key: "appearance", label: "Внешний вид", icon: Palette },
  { key: "editor", label: "Редактор", icon: SquarePen },
  { key: "files", label: "Файлы и ссылки", icon: Link2 },
  { key: "hotkeys", label: "Горячие клавиши", icon: Keyboard },
  { key: "sync", label: "Синхронизация", icon: RefreshCw },
  { key: "about", label: "О приложении", icon: Info },
];

const HOTKEYS: { keys: string; label: string }[] = [
  { keys: "Ctrl / Cmd + B", label: "Жирный" },
  { keys: "Ctrl / Cmd + I", label: "Курсив" },
  { keys: "Ctrl / Cmd + S", label: "Сохранить заметку" },
  { keys: "Tab", label: "Отступ в редакторе" },
  { keys: "Esc", label: "Закрыть панель или окно" },
];

// Строка настройки: название + описание слева, управление справа
function Row({
  name,
  desc,
  children,
}: {
  name: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="nb-set-row">
      <div className="nb-set-info">
        <p className="nb-set-name">{name}</p>
        <p className="nb-set-desc">{desc}</p>
      </div>
      <div className="nb-set-control">{children}</div>
    </div>
  );
}

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={cn("nb-switch", on && "is-on")}
      onClick={onClick}
    />
  );
}

function Seg<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="nb-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={cn(value === o.value && "is-active")}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsModal() {
  const open = useSettings((s) => s.settingsOpen);
  const setOpen = useSettings((s) => s.setOpen);
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const notes = useNotebook((s) => s.notes);
  const folders = useNotebook((s) => s.folders);
  const attachments = useNotebook((s) => s.attachments);
  const lastSynced = useNotebook((s) => s.lastSynced);
  const [section, setSection] = useState<SectionKey>("appearance");

  // Escape закрывает окно независимо от фокуса
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const liveNotes = notes.filter((n) => !n.trashed).length;
  const syncTime = lastSynced
    ? new Date(lastSynced).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : "ещё не было";

  return (
    <div
      className="nb-settings-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Настройки блокнота"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="nb-settings">
        {/* Разделы — сегментация слева, как в Obsidian */}
        <nav className="nb-settings-nav" aria-label="Разделы настроек">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={cn(section === s.key && "is-active")}
              onClick={() => setSection(s.key)}
            >
              <s.icon className="h-4 w-4 shrink-0" />
              {s.label}
            </button>
          ))}
        </nav>

        <div className="nb-settings-body">
          <div className="nb-settings-head">
            <h2 className="flex items-center gap-2 font-display text-[17px] font-bold" style={{ color: "var(--nb-text)" }}>
              <SlidersHorizontal className="h-4 w-4" style={{ color: "var(--flame)" }} />
              Настройки
            </h2>
            <button
              type="button"
              className="nb-icon-btn"
              onClick={() => setOpen(false)}
              aria-label="Закрыть настройки"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="nb-settings-content nb-scroll">
            {/* ---------- Внешний вид ---------- */}
            {section === "appearance" && (
              <section aria-label="Внешний вид">
                <Row name="Тема" desc="Светлая «бумага» или тёмная «глубина» — блокнот по умолчанию светлый">
                  <Seg<NbTheme>
                    label="Тема блокнота"
                    value={settings.theme}
                    options={[
                      { value: "light", label: "Бумага · светлая" },
                      { value: "deep", label: "Глубина · тёмная" },
                    ]}
                    onChange={(theme) => update({ theme })}
                  />
                </Row>
                <Row name="Акцентный цвет" desc="Цвет кнопок, активных вкладок и ссылок [[заметок]]">
                  <span className="flex items-center gap-2">
                    {ACCENTS.map((a) => (
                      <button
                        key={a.value}
                        type="button"
                        className={cn("nb-swatch", settings.accent === a.value && "is-active")}
                        style={{ backgroundColor: a.value }}
                        onClick={() => update({ accent: a.value })}
                        aria-label={`Акцент «${a.label}»`}
                        title={a.label}
                      />
                    ))}
                    <input
                      type="color"
                      value={settings.accent}
                      onChange={(e) => update({ accent: e.target.value })}
                      className="h-[26px] w-[34px] cursor-pointer rounded-md border"
                      style={{ borderColor: "var(--nb-line)", background: "transparent" }}
                      aria-label="Свой акцентный цвет"
                    />
                  </span>
                </Row>
                <Row name="Стекло панелей" desc="Полупрозрачные панели с размытием фона позади">
                  <Switch on={settings.glass} onClick={() => update({ glass: !settings.glass })} label="Стекло панелей" />
                </Row>
                <Row name="Фоновая подложка" desc="Едва заметная фотография под интерфейсом блокнота">
                  <span className="flex items-center gap-1.5">
                    {BG_IMAGES.map((b) => (
                      <button
                        key={b.value}
                        type="button"
                        className={cn("nb-bgthumb", settings.bgImage === b.value && "is-active")}
                        style={b.url ? { backgroundImage: `url(${b.url})` } : undefined}
                        onClick={() => update({ bgImage: b.value })}
                        aria-label={`Фон «${b.label}»`}
                        title={b.label}
                      >
                        {!b.url && <span className="flex h-full w-full items-center justify-center text-[9px]" style={{ color: "var(--nb-muted)" }}>нет</span>}
                      </button>
                    ))}
                  </span>
                </Row>
              </section>
            )}

            {/* ---------- Редактор ---------- */}
            {section === "editor" && (
              <section aria-label="Редактор">
                <Row name="Режим по умолчанию" desc="Как открывать заметку: сразу правка или спокойное чтение">
                  <Seg
                    label="Режим по умолчанию"
                    value={settings.defaultMode}
                    options={[
                      { value: "edit", label: "Правка" },
                      { value: "read", label: "Чтение" },
                    ]}
                    onChange={(defaultMode) => update({ defaultMode })}
                  />
                </Row>
                <Row name="Размер шрифта редактора" desc={`Сейчас ${settings.editorFontSize} пикселей`}>
                  <span className="flex items-center gap-3">
                    <input
                      type="range"
                      min={12}
                      max={22}
                      step={0.5}
                      value={settings.editorFontSize}
                      onChange={(e) => update({ editorFontSize: parseFloat(e.target.value) })}
                      className="nb-range"
                      aria-label="Размер шрифта редактора"
                    />
                    <span className="w-10 text-right font-mono text-[11px]" style={{ color: "var(--nb-muted)" }}>
                      {settings.editorFontSize}
                    </span>
                  </span>
                </Row>
                <Row name="Межстрочный интервал" desc={`Сейчас ${settings.editorLineHeight}`}>
                  <span className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1.4}
                      max={2.2}
                      step={0.05}
                      value={settings.editorLineHeight}
                      onChange={(e) => update({ editorLineHeight: parseFloat(e.target.value) })}
                      className="nb-range"
                      aria-label="Межстрочный интервал редактора"
                    />
                    <span className="w-10 text-right font-mono text-[11px]" style={{ color: "var(--nb-muted)" }}>
                      {settings.editorLineHeight}
                    </span>
                  </span>
                </Row>
                <Row name="Проверка орфографии" desc="Подчёркивать опечатки в редакторе">
                  <Switch on={settings.spellcheck} onClick={() => update({ spellcheck: !settings.spellcheck })} label="Проверка орфографии" />
                </Row>
                <Row name="Счётчик слов" desc="Показывать число слов рядом с панелью форматирования">
                  <Switch on={settings.showWordCount} onClick={() => update({ showWordCount: !settings.showWordCount })} label="Счётчик слов" />
                </Row>
                <Row name="Узкая строка чтения" desc="Ограничить ширину текста в режиме чтения — так глаза меньше устают">
                  <Switch on={settings.readableWidth} onClick={() => update({ readableWidth: !settings.readableWidth })} label="Узкая строка чтения" />
                </Row>
              </section>
            )}

            {/* ---------- Файлы и ссылки ---------- */}
            {section === "files" && (
              <section aria-label="Файлы и ссылки">
                <Row name="Подтверждение удаления" desc="Спрашивать перед перемещением заметки в корзину и удалением папок">
                  <Switch on={settings.confirmDelete} onClick={() => update({ confirmDelete: !settings.confirmDelete })} label="Подтверждение удаления" />
                </Row>
                <Row name="Внутренние ссылки" desc="Формат [[вики-ссылок]]: клик открывает заметку, а если её нет — создаёт">
                  <span className="nb-key">[[заметка]]</span>
                </Row>
                <Row name="Вложения" desc="Прикрепляются к открытой заметке и открываются вкладкой сверху">
                  <span className="nb-key">[[файл:имя]]</span>
                </Row>
                <Row name="GitHub-ссылки" desc="Вставляй ссылку на репозиторий, issue или gist — она станет живой карточкой">
                  <span className="nb-key">github.com/…</span>
                </Row>
                <Row name="Экспорт PDF" desc="Кнопка в шапке заметки собирает аккуратный документ для печати">
                  <FileDown className="h-4 w-4" style={{ color: "var(--flame)" }} />
                </Row>
              </section>
            )}

            {/* ---------- Горячие клавиши ---------- */}
            {section === "hotkeys" && (
              <section aria-label="Горячие клавиши">
                <p className="pb-3 pt-1 text-[12px]" style={{ color: "var(--nb-muted)" }}>
                  Текущие привязки — как в Obsidian, работают везде внутри блокнота.
                </p>
                {HOTKEYS.map((h) => (
                  <div key={h.keys} className="nb-hotkey">
                    <span>{h.label}</span>
                    <span className="nb-key">{h.keys}</span>
                  </div>
                ))}
              </section>
            )}

            {/* ---------- Синхронизация ---------- */}
            {section === "sync" && (
              <section aria-label="Синхронизация">
                <Row name="Фоновое обновление" desc="Как часто блокнот сверяется с сервером, пока ты пишешь">
                  <Seg<number>
                    label="Интервал фонового обновления"
                    value={settings.syncInterval}
                    options={[
                      { value: 0, label: "Выкл" },
                      { value: 15, label: "15 с" },
                      { value: 30, label: "30 с" },
                      { value: 60, label: "60 с" },
                    ]}
                    onChange={(syncInterval) => update({ syncInterval })}
                  />
                </Row>
                <Row name="Обновление по фокусу" desc="Сверяться сразу, как только возвращаешься во вкладку">
                  <Switch on={settings.syncOnFocus} onClick={() => update({ syncOnFocus: !settings.syncOnFocus })} label="Обновление по фокусу" />
                </Row>
                <Row name="Последняя синхронизация" desc="Статус виден и на верхней панели блокнота">
                  <span className="nb-key">{syncTime}</span>
                </Row>
                <Row name="Заметки между устройствами" desc="Телефон и компьютер видят одни и те же заметки — аккаунт общий">
                  <Check className="h-4 w-4" style={{ color: "var(--flame)" }} />
                </Row>
              </section>
            )}

            {/* ---------- О приложении ---------- */}
            {section === "about" && (
              <section aria-label="О приложении">
                <div className="flex flex-col gap-1 py-1">
                  <p className="font-display text-[22px] font-bold" style={{ color: "var(--nb-text)" }}>
                    MINDLY
                    <span className="ml-2 align-middle font-sans text-[11px] font-medium" style={{ color: "var(--nb-muted)" }}>
                      версия 1.2 · веб
                    </span>
                  </p>
                  <p className="mt-2 max-w-[52ch] text-[12.5px] leading-relaxed" style={{ color: "var(--nb-muted)" }}>
                    Блокнот, который живёт в браузере: markdown, внутренние ссылки, граф связей,
                    вложения, GitHub-карточки и экспорт в PDF. Ничего устанавливать не нужно.
                  </p>
                </div>
                <Row name="Заметки" desc={`В блокноте ${liveNotes} ${pluralRu(liveNotes, "заметка", "заметки", "заметок")}`}>
                  <SquarePen className="h-4 w-4" style={{ color: "var(--nb-muted)" }} />
                </Row>
                <Row name="Папки" desc={`${folders.length} ${pluralRu(folders.length, "папка", "папки", "папок")} для порядка`}>
                  <FolderCog className="h-4 w-4" style={{ color: "var(--nb-muted)" }} />
                </Row>
                <Row name="Вложения" desc={`${attachments.length} ${pluralRu(attachments.length, "файл", "файла", "файлов")} при заметках`}>
                  <FileDown className="h-4 w-4" style={{ color: "var(--nb-muted)" }} />
                </Row>
                <Row name="Сбросить настройки" desc="Вернуть все параметры к значениям по умолчанию">
                  <button
                    type="button"
                    className="nb-ghost-btn"
                    onClick={() => {
                      update({ ...DEFAULT_SETTINGS });
                      window.location.reload();
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Сбросить
                  </button>
                </Row>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
