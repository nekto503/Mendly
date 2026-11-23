"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import type { PublicUser } from "@/components/notebook/types";
import type { SiteView } from "./AppShell";

type Props = {
  onNav: (v: SiteView) => void;
  onOpenAuth: (tab: "login" | "register") => void;
  user: PublicUser | null;
};

// Подвал: контурное слово с параллаксом, вкладки сайта, копирайт.
// mt-auto прижимает футер к низу, когда контент короче экрана.
export default function SiteFooter({ onNav, onOpenAuth, user }: Props) {
  const wordRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Слово «выплывает» снизу при въезде в подвал
      const tw = gsap.fromTo(
        wordRef.current,
        { yPercent: 30 },
        {
          yPercent: 0,
          ease: "none",
          scrollTrigger: { trigger: wordRef.current, start: "top bottom", end: "bottom bottom", scrub: true },
        }
      );
      return () => {
        tw.scrollTrigger?.kill();
        tw.kill();
      };
    });
    return () => mm.revert();
  }, []);

  const links: { label: string; action: () => void }[] = [
    { label: "Главная", action: () => onNav("home") },
    { label: "Возможности", action: () => onNav("features") },
    { label: "Блокнот", action: () => onNav("notebook") },
    ...(user
      ? []
      : [
          { label: "Войти", action: () => onOpenAuth("login") },
          { label: "Регистрация", action: () => onOpenAuth("register") },
        ]),
  ];

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-white/10 bg-deep text-frost">
      <div className="u-container py-16 md:py-20">
        <div ref={wordRef} className="footer-word" aria-hidden="true">
          MINDLY
        </div>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          <div>
            <p className="font-display text-xl italic text-flame">место для твоих мыслей</p>
            <p className="mt-4 max-w-[32ch] text-sm leading-relaxed text-white/55">
              Все заметки живут в браузере: начинаешь на телефоне — продолжаешь на компьютере.
            </p>
          </div>
          <nav aria-label="Навигация в подвале" className="flex flex-col items-start gap-3">
            {links.map((l) => (
              <button key={l.label} type="button" onClick={l.action} className="footer-link">
                {l.label}
              </button>
            ))}
          </nav>
          <div className="flex flex-col gap-3 text-sm text-white/55 md:items-end">
            <span className="font-mono text-xs uppercase tracking-[0.24em] text-white/45">mindly.app</span>
            <span>открой вкладку — и пиши</span>
          </div>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/45">
          <span>© 2026 MINDLY</span>
        </div>
      </div>
    </footer>
  );
}
