"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { TextEffect } from "@/components/core/text-effect";
import type { PublicUser } from "@/components/notebook/types";

type Props = {
  user: PublicUser | null;
  onNotebook: () => void;
  onRegister: () => void;
};

// ФИНАЛ: цветочный «горизонт» с параллаксом, большой призыв и кнопка в блокнот.
// Кадр пропорцией 3:2 совпадает со снимком — фото показывается целиком, без обрезки.
export default function Finale({ user, onNotebook, onRegister }: Props) {
  const secRef = useRef<HTMLElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sec = secRef.current;
    if (!sec) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: sec, start: "top 65%", once: true },
        defaults: { ease: "expo.out" },
      });
      tl.from(".ft-banner", { y: 56, autoAlpha: 0, duration: 1.5, ease: "power2.out" })
        .from(".ft-line", { y: 48, autoAlpha: 0, stagger: 0.2, duration: 1.3, ease: "power2.out" }, 0.4)
        .from(".finale-sub", { y: 22, autoAlpha: 0, duration: 1.2, ease: "power2.out" }, 0.75)
        .from(".finale-actions", { y: 22, autoAlpha: 0, duration: 1.2, ease: "power2.out" }, 0.9);

      // Параллакс внутри баннера: кадр «дышит» при скролле
      const par = gsap.to(bannerRef.current, {
        yPercent: 12,
        ease: "none",
        scrollTrigger: { trigger: sec, start: "top bottom", end: "bottom top", scrub: true },
      });

      // Свечение фона медленно «дышит»
      const glows = gsap.utils
        .toArray<HTMLElement>(".finale-glow, .finale-glow-b", sec)
        .map((g, i) =>
          gsap.to(g, { scale: i ? 1.15 : 0.92, duration: 9 + i * 3, ease: "sine.inOut", repeat: -1, yoyo: true })
        );
      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
        par.scrollTrigger?.kill();
        par.kill();
        glows.forEach((g) => g.kill());
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={secRef} id="finale" className="relative overflow-hidden bg-deep py-[16vh] text-frost md:py-[20vh]">
      <div className="finale-glow" aria-hidden="true" />
      <div className="finale-glow-b" aria-hidden="true" />
      <div className="u-container relative z-10 flex flex-col items-center text-center">
        <h2 className="section-label">
          <span className="idx">05</span>финал — и начало
        </h2>

        {/* Цветочный горизонт: кадр, который подтягивается скроллом */}
        <div
          className="ft-banner relative mt-12 w-full max-w-[880px] overflow-hidden rounded-[24px] border border-white/10"
          aria-hidden="true"
        >
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <div ref={bannerRef} className="absolute -inset-y-[10%] inset-x-0">
              <Image
                src="/photos/flower-hill.jpg"
                alt=""
                fill
                quality={85}
                sizes="(max-width: 1023px) 100vw, 880px"
                className="object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(4,21,28,0.5)] via-transparent to-transparent" />
          </div>
          <p className="absolute bottom-5 left-6 font-mono text-[10px] uppercase tracking-[0.28em] text-white/75">
            утро · кофе · одна открытая вкладка
          </p>
        </div>

        <h3 className="finale-title mt-14">
          <span className="ft-line block">Твои мысли заслуживают</span>
          <span className="ft-line block">
            <em>одного места</em>
          </span>
        </h3>
        <p className="finale-sub">
          MINDLY уже открыт для всех: регистрация занимает полминуты, заметки живут в браузере и
          следуют за тобой между телефоном и компьютером.
        </p>
        <div className="finale-actions mt-10 flex flex-wrap items-center justify-center gap-4">
          <button type="button" className="btn btn-flame" aria-label="Открыть блокнот" onClick={onNotebook}>
            {user ? "Продолжить в блокноте" : "Открыть блокнот"}
          </button>
          {!user && (
            <button type="button" className="btn btn-ghost-inv" aria-label="Создать аккаунт" onClick={onRegister}>
              Создать аккаунт
            </button>
          )}
        </div>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.26em] text-white/40">
          <TextEffect per="char" preset="fade" duration={0.35}>
            почта · пароль — вход без установки приложений
          </TextEffect>
        </p>
      </div>
    </section>
  );
}
