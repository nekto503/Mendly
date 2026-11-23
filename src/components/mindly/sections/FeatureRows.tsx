"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { gsap } from "@/lib/gsap";
import { Artwork } from "./Artwork";
import type { ArtKind } from "../Artwork";
import { IconArrowUpRight } from "../icons";

// ДЕТАЛИ/ФИЧИ: крупный список во всю ширину; hover — строка заливается, сбоку всплывает превью
const ROWS: { t: string; tag: string; art: ArtKind }[] = [
  { t: "Синхронизация", tag: "телефон ↔ компьютер", art: "sync" },
  { t: "Markdown", tag: "форматирование текста", art: "markdown" },
  { t: "GitHub-ссылки", tag: "репозитории · issues · gists", art: "github" },
  { t: "Вложения", tag: "файлы внутри заметок", art: "files" },
  { t: "Вкладки-папки", tag: "открытые заметки сверху", art: "tabs" },
  { t: "Экспорт PDF", tag: "поделиться в один клик", art: "pdf" },
];

export default function FeatureRows() {
  const secRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const quick = useRef<{ x?: gsap.QuickToFunc; y?: gsap.QuickToFunc }>({});

  // Карточка-превью летит за курсором (только точные указатели)
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.set(card, { xPercent: -50, yPercent: -118, scale: 0.9, autoAlpha: 0 });
    quick.current.x = gsap.quickTo(card, "x", { duration: 0.5, ease: "power3" });
    quick.current.y = gsap.quickTo(card, "y", { duration: 0.5, ease: "power3" });
    const move = (e: MouseEvent) => {
      quick.current.x?.(e.clientX);
      quick.current.y?.(e.clientY);
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, []);

  useEffect(() => {
    const sec = secRef.current;
    if (!sec) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const rows = gsap.utils.toArray<HTMLElement>(".row", sec);
      const tw = gsap.from(rows, {
        autoAlpha: 0,
        y: 48,
        stagger: 0.11,
        duration: 1.3,
        ease: "power2.out",
        scrollTrigger: { trigger: listRef.current, start: "top 82%", once: true },
      });
      const label = gsap.from(".rows-label", {
        autoAlpha: 0,
        y: 22,
        duration: 1.1,
        ease: "power2.out",
        scrollTrigger: { trigger: sec, start: "top 84%", once: true },
      });
      return () => {
        tw.scrollTrigger?.kill();
        tw.kill();
        label.scrollTrigger?.kill();
        label.kill();
      };
    });
    return () => mm.revert();
  }, []);

  // Показ превью у курсора; при первом mouseenter координаты ещё не приходили через mousemove — ставим их из события
  const show = (i: number, e?: ReactMouseEvent<HTMLLIElement>) => {
    setActive(i);
    if (e && cardRef.current) {
      gsap.set(cardRef.current, { x: e.clientX, y: e.clientY });
      quick.current.x?.(e.clientX);
      quick.current.y?.(e.clientY);
    }
    gsap.to(cardRef.current, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "power3.out" });
  };
  const hide = () => {
    gsap.to(cardRef.current, { autoAlpha: 0, scale: 0.9, duration: 0.3, ease: "power3.out" });
  };

  return (
    <section ref={secRef} id="features" className="relative bg-paper pb-[14vh] pt-[8vh]">
      <div className="u-container">
        <h2 className="section-label rows-label">
          <span className="idx">03</span>что внутри
        </h2>
        <ul ref={listRef} className="rows mt-14" onMouseLeave={hide}>
          {ROWS.map((r, i) => (
            <li key={r.t} className="row" onMouseEnter={(e) => show(i, e)}>
              <span className="row-fill" aria-hidden="true" />
              <div className="row-inner">
                <span className="row-idx" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="row-title">{r.t}</h3>
                <span className="row-tag">{r.tag}</span>
                <IconArrowUpRight className="row-arrow" />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Плавающее превью активной строки */}
      <div ref={cardRef} className="preview-card" aria-hidden="true">
        <Artwork kind={ROWS[active].art} />
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.24em] opacity-60">{ROWS[active].tag}</p>
      </div>
    </section>
  );
}
