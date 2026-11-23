"use client";

import { useEffect, useRef, useState } from "react";
import { Github, LogOut, Menu, NotebookPen, ScrollText } from "lucide-react";
import { useTheme } from "next-themes";
import { ScrollTrigger } from "@/lib/gsap";
import ThemeToggle from "./ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { PublicUser } from "@/components/notebook/types";
import type { SiteView } from "./AppShell";

const TABS: { key: SiteView; label: string }[] = [
  { key: "home", label: "Главная" },
  { key: "features", label: "Возможности" },
  { key: "notebook", label: "Блокнот" },
];

// Цвет чипа-аватара: стабильный по почте — пламя или прибой
export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % 2 === 0 ? "#db3996" : "#0593c6";
}

type Props = {
  view: SiteView;
  onNav: (v: SiteView) => void;
  user: PublicUser | null;
  onOpenAuth: (tab: "login" | "register") => void;
  onLogout: () => void;
};

// Фиксированная шапка: вкладки продукта, вход/аккаунт, стеклянное состояние после скролла
export default function SiteHeader({ view, onNav, user, onOpenAuth, onLogout }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Radix-идентификаторы Sheet рендерим только после гидрации — без рассинхрона aria-атрибутов
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    // Стеклянная подложка включается, когда страница уехала от нуля
    const st = ScrollTrigger.create({
      start: 80,
      end: "max",
      onToggle: (self) => setScrolled(self.isActive),
    });
    return () => st.kill();
  }, []);

  const go = (v: SiteView) => {
    onNav(v);
    setMenuOpen(false);
  };

  return (
    <header ref={ref} className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="u-container flex h-16 items-center justify-between gap-4 md:h-20">
        <button
          type="button"
          onClick={() => go("home")}
          className="logo shrink-0"
          aria-label="MINDLY — на главную"
        >
          MINDLY
          <span className="logo-dot" aria-hidden="true" />
        </button>

        <nav className="hidden items-center gap-9 md:flex" aria-label="Разделы сайта">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => go(t.key)}
              className={`nav-link ${view === t.key ? "is-active" : ""}`}
              aria-current={view === t.key ? "page" : undefined}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          {/* GitHub-репозиторий проекта: открывается в новой вкладке */}
          <a
            href="https://github.com/nekto503/Mendly"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-mini inline-flex items-center justify-center"
            aria-label="Исходный код MINDLY на GitHub"
            title="GitHub-репозиторий MINDLY"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
          </a>
          <ThemeToggle className="btn-mini" />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="user-chip" aria-label="Меню аккаунта">
                  <span
                    className="user-chip-avatar"
                    style={{ backgroundColor: avatarColor(user.email) }}
                    aria-hidden="true"
                  >
                    {(user.name ?? user.email)[0].toUpperCase()}
                  </span>
                  <span className="user-chip-name hidden sm:inline">{user.name ?? user.email}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <span className="block truncate text-sm font-medium">{user.name ?? "Без имени"}</span>
                  <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => go("notebook")}>
                  <NotebookPen className="h-4 w-4" /> Открыть блокнот
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-[#c22e63] focus:text-[#c22e63]">
                  <LogOut className="h-4 w-4" /> Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button type="button" className="btn-mini hidden sm:inline-flex" onClick={() => onOpenAuth("login")}>
              Войти
            </button>
          )}

          <button
            type="button"
            className="btn-mini btn-cta hidden sm:inline-flex"
            onClick={() => go("notebook")}
          >
            Открыть блокнот
          </button>

          {/* Мобильное меню — только после гидрации, чтобы Radix-ID совпадали */}
          {mounted && (
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button type="button" className="burger md:hidden" aria-label="Открыть меню">
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-deep text-frost border-white/10">
              <SheetTitle className="logo">
                MINDLY
                <span className="logo-dot" aria-hidden="true" />
              </SheetTitle>
              <nav className="mt-8 flex flex-col gap-2" aria-label="Разделы сайта, мобильное меню">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => go(t.key)}
                    className={`nav-link text-left text-sm ${view === t.key ? "is-active" : ""}`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
              <div className="mt-8 flex flex-col gap-3">
                {user ? (
                  <button
                    type="button"
                    className="btn-mini w-full"
                    onClick={() => {
                      onLogout();
                      setMenuOpen(false);
                    }}
                  >
                    Выйти
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className="btn-mini w-full"
                      onClick={() => {
                        onOpenAuth("login");
                        setMenuOpen(false);
                      }}
                    >
                      Войти
                    </button>
                    <button
                      type="button"
                      className="btn-mini w-full"
                      onClick={() => {
                        onOpenAuth("register");
                        setMenuOpen(false);
                      }}
                    >
                      Регистрация
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  className="btn-mini w-full"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {mounted && theme === "dark" ? "Светлая тема" : "Тёмная тема"}
                </button>
                <a
                  href="https://github.com/nekto503/Mendly"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-mini inline-flex w-full items-center justify-center gap-2"
                  onClick={() => setMenuOpen(false)}
                >
                  <Github className="h-4 w-4" aria-hidden="true" />
                  GitHub-репозиторий
                </a>
                <button
                  type="button"
                  className="btn-mini btn-cta w-full"
                  onClick={() => go("notebook")}
                >
                  Открыть блокнот
                </button>
              </div>
              <p className="mt-10 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
                <ScrollText className="h-3.5 w-3.5" />
                заметки живут в браузере
              </p>
            </SheetContent>
          </Sheet>
          )}
        </div>
      </div>
    </header>
  );
}
