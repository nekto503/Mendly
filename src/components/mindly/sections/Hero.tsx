"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap, SplitText } from "@/lib/gsap";
import { IconSpark, IconArrowDown } from "../icons";
import { TextEffect } from "@/components/core/text-effect";
import type { PublicUser } from "@/components/notebook/types";

type Props = {
  start: boolean;
  user: PublicUser | null;
  onNotebook: () => void;
  onFeatures: () => void;
};

// Заголовок рендерится через dangerouslySetInnerHTML: SplitText пересоздаёт дочерние узлы,
// и React не должен отслеживать их, иначе при размонтировании вкладки removeChild падает
const TITLE_HTML = "MINDLY — место<br/>для <span>твоих</span> <em>мыслей</em>";

// HERO: гигантский заголовок собирается по буквам, справа — фото-карточка
// с «дыханием» и параллаксом; фон — контурное слово и свечения.
// Фото розы показывается целиком (object-contain) на тонированной подложке в цвет фона снимка.
export default function Hero({ start, user, onNotebook, onFeatures }: Props) {
  const secRef = useRef<HTMLElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const overRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const actRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const startedRef = useRef(false);

  // Старт интро по сигналу прелоадера
  useEffect(() => {
    if (start) startedRef.current = true;
    if (start && tlRef.current) tlRef.current.play();
  }, [start]);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const sec = secRef.current;
      if (!sec) return;

      // Заголовок: буквы поднимаются из «тумана» (без mask — чтобы не резать кириллические «й» и «ы»)
      const split = new SplitText(titleRef.current!, { type: "chars" });
      gsap.set(split.chars, { yPercent: 120, autoAlpha: 0 });
      gsap.set([overRef.current, subRef.current, actRef.current, hintRef.current, mediaRef.current], {
        autoAlpha: 0,
        y: 26,
      });

      const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
      tl.to(split.chars, { yPercent: 0, autoAlpha: 1, duration: 1.15, stagger: 0.03 }, 0)
        .to(overRef.current, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.35)
        .to(subRef.current, { autoAlpha: 1, y: 0, duration: 1 }, 0.65)
        .to(actRef.current, { autoAlpha: 1, y: 0, duration: 1 }, 0.8)
        .to(mediaRef.current, { autoAlpha: 1, y: 0, duration: 1.2 }, 0.55)
        .to(hintRef.current, { autoAlpha: 1, y: 0, duration: 1 }, 1.05);
      tlRef.current = tl;
      if (startedRef.current) tl.play();

      // Параллакс гигантского контурного слова
      const par = gsap.to(wordRef.current, {
        yPercent: 24,
        ease: "none",
        scrollTrigger: { trigger: sec, start: "top top", end: "bottom top", scrub: true },
      });

      // Параллакс фото-карточки + мягкое «дыхание»
      const mediaPar = gsap.to(mediaRef.current, {
        yPercent: -6,
        ease: "none",
        scrollTrigger: { trigger: sec, start: "top top", end: "bottom top", scrub: true },
      });
      const breathe = gsap.to(mediaRef.current, {
        scale: 1.015,
        duration: 6,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      // Мягкие переливы свечений
      const glows = gsap.utils
        .toArray<HTMLElement>(".hero-glow", sec)
        .map((g, i) =>
          gsap.to(g, { xPercent: i ? -7 : 8, yPercent: i ? 7 : -8, duration: 7 + i * 2, ease: "sine.inOut", repeat: -1, yoyo: true })
        );

      return () => {
        split.revert();
        tl.kill();
        par.scrollTrigger?.kill();
        par.kill();
        mediaPar.scrollTrigger?.kill();
        mediaPar.kill();
        breathe.kill();
        glows.forEach((g) => g.kill());
        tlRef.current = null;
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <section
      ref={secRef}
      id="hero"
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-paper pb-16 pt-28 md:pb-24"
    >
      <div className="hero-glow hero-glow-a" aria-hidden="true" />
      <div className="hero-glow hero-glow-b" aria-hidden="true" />
      <div ref={wordRef} className="hero-word" aria-hidden="true">
        MINDLY
      </div>

      <div className="u-container relative z-10 mt-6 grid items-center gap-12 lg:mt-0 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <p ref={overRef} className="hero-overline">
            <IconSpark />
            <TextEffect per="char" preset="fade" duration={0.4} delay={0.15}>
              заметки, которые всегда с тобой — в браузере
            </TextEffect>
          </p>
          <h1 ref={titleRef} className="hero-title" dangerouslySetInnerHTML={{ __html: TITLE_HTML }} />
          <p ref={subRef} className="hero-sub">
            Блокнот, который живёт в браузере. Записывай на телефоне, открывай на компьютере: мысли
            синхронизируются сами, а ты просто пишешь.
          </p>
          <div ref={actRef} className="hero-actions">
            <button
              type="button"
              className="btn btn-primary"
              aria-label="Открыть блокнот"
              onClick={onNotebook}
            >
              {user ? "Продолжить в блокноте" : "Открыть блокнот"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              aria-label="Посмотреть, как это работает"
              onClick={onFeatures}
            >
              Как это работает
              <IconArrowDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Фотоколлаж из снимков пользователя: розовая волна в герое + полароид с розой.
            Пропорции контейнеров совпадают с пропорциями снимков — кадры без обрезки */}
        <div ref={mediaRef} className="hero-media-wrap">
          <div className="hero-media relative w-full overflow-hidden rounded-[26px] border border-[color:rgba(var(--ink-rgb),0.12)] shadow-[0_40px_90px_-40px_rgba(4,21,28,0.45)]">
            <div className="relative aspect-[16/9] w-full">
              <Image
                src="/photos/pink-waves.jpg"
                alt="Глянцевые розовые волны — мягкие складки света"
                fill
                priority
                quality={90}
                sizes="(max-width: 1023px) 100vw, 44vw"
                className="object-cover"
              />
            </div>
            <div
              className="absolute inset-0 bg-gradient-to-t from-[rgba(4,21,28,0.42)] via-transparent to-transparent"
              aria-hidden="true"
            />
            {/* Подпись, живущая на самой фотографии */}
            <p className="absolute left-6 top-5 z-10 font-mono text-[11px] uppercase tracking-[0.26em] text-white/90">
              мысли разные — блокнот один
            </p>
            {/* Стеклянные чипы поверх фото */}
            <div className="absolute bottom-5 left-5 right-5 flex flex-wrap gap-2">
              {["синхронизация", "markdown", "вкладки", "pdf"].map((chip, i) => (
                <span
                  key={chip}
                  className="hero-chip"
                  style={{ animationDelay: `${i * 1.4}s` }}
                >
                  {chip}
                </span>
              ))}
            </div>
            <span className="hero-media-badge" aria-hidden="true">
              <i />
              Mindly
            </span>
          </div>
          {/* Полароид-вклейка: роза в бледном небе, живёт поверх угла розовой волны */}
          <div className="hero-polaroid">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[14px]">
              <Image
                src="/photos/rose.jpg"
                alt="Роза в бледном небе — снимок из фотоколлекции MINDLY"
                fill
                quality={90}
                sizes="(max-width: 1023px) 34vw, 190px"
                className="object-cover"
              />
            </div>
            <span className="hero-polaroid-note" aria-hidden="true">
              мысль №1
            </span>
          </div>
          <div className="hero-media-glow" aria-hidden="true" />
        </div>
      </div>

      <div ref={hintRef} className="hero-hint" aria-hidden="true">
        <span>скролль</span>
        <span className="hint-line" />
      </div>
    </section>
  );
}
