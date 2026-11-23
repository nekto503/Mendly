"use client";

import { ArrowLeft, CheckCheck, CloudAlert, CloudUpload, LogOut, NotebookPen, Paperclip, Settings, Waypoints, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotebook } from "./store";
import { useSettings } from "./settings";
import { avatarColor } from "@/components/site/SiteHeader";
import type { PublicUser } from "./types";
import { cn } from "@/lib/utils";

// Верхняя панель блокнота: слева — стрелка на сайт и переключение «Дневник / Граф»,
// в центре — открытые файлы вкладками, справа — статус синхронизации и аккаунт
export default function TabBar({ user, onGoSite, onLogout }: { user: PublicUser; onGoSite: () => void; onLogout: () => void }) {
  const tabs = useNotebook((s) => s.tabs);
  const activeKey = useNotebook((s) => s.activeKey);
  const setActive = useNotebook((s) => s.setActive);
  const closeTab = useNotebook((s) => s.closeTab);
  const graphOpen = useNotebook((s) => s.graphOpen);
  const setGraph = useNotebook((s) => s.setGraph);
  const saving = useNotebook((s) => s.saving);
  const lastSynced = useNotebook((s) => s.lastSynced);
  const setSettingsOpen = useSettings((s) => s.setOpen);

  const syncTime = lastSynced
    ? new Date(lastSynced).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="nb-tabbar">
      {/* Слева: стрелка на основной сайт + разделы дневника */}
      <div className="flex items-center gap-1.5 pl-2.5 pr-1">
        <button
          type="button"
          className="nb-icon-btn"
          onClick={onGoSite}
          aria-label="Вернуться на основной сайт"
          title="На основной сайт"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={cn("nb-rail-btn", !graphOpen && "is-active")}
          onClick={() => setGraph(false)}
          aria-pressed={!graphOpen}
        >
          <NotebookPen className="h-3.5 w-3.5" />
          <span>Дневник</span>
        </button>
        <button
          type="button"
          className={cn("nb-rail-btn", graphOpen && "is-active")}
          onClick={() => setGraph(true)}
          aria-pressed={graphOpen}
        >
          <Waypoints className="h-3.5 w-3.5" />
          <span>Граф</span>
        </button>
      </div>

      {/* Вкладки открытых файлов */}
      <div className="nb-tabs" role="tablist" aria-label="Открытые файлы">
        {tabs.map((t) => (
          <div
            key={t.key}
            role="tab"
            aria-selected={t.key === activeKey && !graphOpen}
            className={cn("nb-tab", t.key === activeKey && !graphOpen && "is-active")}
            onClick={() => setActive(t.key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setActive(t.key);
            }}
            tabIndex={0}
          >
            {t.kind === "note" ? (
              <NotebookPen className="h-3.5 w-3.5 shrink-0 opacity-70" />
            ) : (
              <Paperclip className="h-3.5 w-3.5 shrink-0 opacity-70" />
            )}
            <span className="nb-tab-title">{t.title}</span>
            <button
              type="button"
              className="nb-tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(t.key);
              }}
              aria-label={`Закрыть вкладку ${t.title}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Справа: только статус синхронизации и аккаунт */}
      <div className="flex items-center gap-1.5 pl-2 pr-3">
        <span
          className="nb-sync"
          aria-live="polite"
          title={saving ? "Идёт сохранение" : "Сервер и блокнот совпадают"}
        >
          {saving ? (
            <CloudUpload className="h-3.5 w-3.5" />
          ) : syncTime ? (
            <CheckCheck className="h-3.5 w-3.5" />
          ) : (
            <CloudAlert className="h-3.5 w-3.5" />
          )}
          <span className="hidden xl:inline">
            {saving ? "сохранение…" : syncTime ? `синхронизировано · ${syncTime}` : "о синхронизации"}
          </span>
        </span>

        {/* Аккаунт: круглый чип с ровной обводкой */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="nb-avatar-btn" aria-label="Меню аккаунта">
              <span
                className="user-chip-avatar"
                style={{ backgroundColor: avatarColor(user.email) }}
                aria-hidden="true"
              >
                {(user.name ?? user.email)[0].toUpperCase()}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <span className="block truncate text-sm font-medium">{user.name ?? "Без имени"}</span>
              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setGraph(false)}>
              <NotebookPen className="h-4 w-4" /> Дневник
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" /> Настройки
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onGoSite}>Вернуться на сайт</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-[#ff7ab0] focus:text-[#ff7ab0]">
              <LogOut className="h-4 w-4" /> Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
