"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";

// Кадры коллажа: пропорции контейнеров совпадают с пропорциями снимков —
// фото показываются целиком, без обрезки, в максимальном качестве
const FRAMES = [
  {
    src: "/photos/books.jpg",
    alt: "Рука держит стопку книг, сверху — бокал с водой на розовом фоне",
    caption: "вечер для заметок: книги, стакан и одна свободная рука",
    ratio: "aspect-[3/2]",
    speeds: { x: 0, y: 1.6 },
    cls: "md:col-span-7",
  },
  {
    src: "/photos/pink-wall.jpg",
    alt: "Розовая стена с единственным окном и зелёной шторой",
    caption: "одно окно среди однотипных стен — как вкладка среди однотипных окон",
    ratio: "aspect-[200/252]",
    speeds: { x: 0, y: -2.2 },
    cls: "md:col-span-5 md:mt-24",
  },
];

// МОМЕНТЫ — фотоколлаж на главной: кадры в естественных пропорциях,
// мягкий параллакс на скролле. Никаких рамок-«шкатулок»: воздух, сетка, подписи.
export default function Moments() {
  const secRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const sec = secRef.current;
    if (!sec) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Появление кадров
      const cards = gsap.utils.toArray<HTMLElement>(".moment-card", sec);
      const reveals = cards.map((el) =>
        gsap.from(el, {
          autoAlpha: 0,
          y: 56,
          duration: 1.4,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 86%", once: true },
        })
      );

      // Мягкий параллакс: каждый кадр плывёт со своей скоростью
      const drifts = cards.map((el) => {
        const speed = parseFloat(el.dataset.speed ?? "0");
        return gsap.to(el, {
          yPercent: speed,
          ease: "none",
          scrollTrigger: {
            trigger: sec,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.5,
          },
        });
      });

      const label = gsap.from(".moments-label", {
        autoAlpha: 0,
        y: 24,
        duration: 1.2,
        ease: "power2.out",
        scrollTrigger: { trigger: sec, start: "top 84%", once: true },
      });

      return () => {
        reveals.forEach((t) => {
          t.scrollTrigger?.kill();
          t.kill();
        });
        drifts.forEach((t) => {
          t.scrollTrigger?.kill();
          t.kill();
        });
        label.scrollTrigger?.kill();
        label.kill();
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={secRef} id="moments" className="relative overflow-hidden bg-paper py-[14vh]">
      <div className="u-container">
        <h2 className="section-label moments-label">
          <span className="idx">04</span>моменты
        </h2>

        <div className="mt-14 grid gap-10 md:grid-cols-12 md:gap-12">
          {FRAMES.map((f) => (
            <figure
              key={f.src}
              className={`moment-card ${f.cls}`}
              data-speed={f.speeds.y}
            >
              <div
                className={`relative w-full overflow-hidden rounded-[22px] border border-[color:rgba(var(--ink-rgb),0.1)] shadow-[0_36px_80px_-42px_rgba(4,21,28,0.4)] ${f.ratio}`}
              >
                <Image
                  src={f.src}
                  alt={f.alt}
                  fill
                  quality={88}
                  sizes="(max-width: 767px) 100vw, (max-width: 1279px) 55vw, 46vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-4 font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.22em] text-[color:rgba(var(--ink-rgb),0.55)]">
                {f.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
