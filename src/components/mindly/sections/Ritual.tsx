"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";

// Три шага ритуала: слова сменяют друг друга на закреплённой сцене
const STEPS = [
  {
    n: "01",
    t: "Записывай",
    d: "Идея пришла — открыл вкладку и напечатал. Телефон или компьютер — не важно, мысль попадёт домой.",
  },
  {
    n: "02",
    t: "Сохраняй",
    d: "Заметка сама уезжает в базу: теги, внутренние ссылки и вложения остаются на своих местах.",
  },
  {
    n: "03",
    t: "Возвращайся",
    d: "Через день или через год — всё лежит там, где ты оставил. Поиск находит нужное за секунду.",
  },
];

// Возврат секции из pin-spacer до удаления React'ом (см. CoreScene.unwrapPin)
function unwrapPin(sec: HTMLElement) {
  const spacer = sec.parentElement;
  if (spacer && spacer.classList.contains("pin-spacer")) {
    const parent = spacer.parentElement;
    if (parent) parent.insertBefore(sec, spacer);
    spacer.remove();
  }
}

// РИТУАЛ МЫСЛИ — скроллтеллинг на главной: секция закрепляется, фон-поле проявляется,
// слова шагов просто перелистываются скроллом. Никаких картинок в сцене — только типографика.
export default function Ritual() {
  const secRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sec = secRef.current;
    if (!sec) return;
    const mm = gsap.matchMedia();

    // Мобильные: вертикальный стек с мягкими появлениями, без пина
    mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", () => {
      const items = gsap.utils.toArray<HTMLElement>(".ritual-reveal", sec);
      const tweens = items.map((el) =>
        gsap.from(el, {
          autoAlpha: 0,
          y: 40,
          duration: 1.3,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 86%", once: true },
        })
      );
      const bg = gsap.from(bgRef.current, {
        autoAlpha: 0,
        duration: 1.4,
        ease: "power2.out",
        scrollTrigger: { trigger: sec, start: "top 80%", once: true },
      });
      return () => {
        tweens.forEach((t) => {
          t.scrollTrigger?.kill();
          t.kill();
        });
        bg.scrollTrigger?.kill();
        bg.kill();
      };
    });

    // Десктоп: пин + скраб — сцена живёт на прокрутке
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const bg = bgRef.current;
      if (!bg) return;

      const steps = gsap.utils.toArray<HTMLElement>(".ritual-step", sec);
      const dotFills = gsap.utils.toArray<HTMLElement>(".ritual-dot-fill", sec);

      // Начальные состояния до первого кадра
      gsap.set(steps, { autoAlpha: 0, y: 34 });
      gsap.set(steps[0], { autoAlpha: 0, y: 34 });
      gsap.set(bg, { autoAlpha: 0, scale: 1.1 });
      gsap.set(dotFills, { scaleX: 0 });

      const tl = gsap.timeline({
        defaults: { ease: "power1.inOut" },
        scrollTrigger: {
          trigger: sec,
          start: "top top",
          end: "+=260%",
          scrub: 1.7, // долгое «догоняющее» сглаживание — склейки тают, а не щёлкают
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Фон-поле проявляется и оседает
      tl.to(bg, { autoAlpha: 0.62, scale: 1.02, duration: 1.1, ease: "power1.inOut" }, 0)
        // Шаг 1
        .to(steps[0], { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.1)
        .to(dotFills[0], { scaleX: 1, duration: 0.35, ease: "none" }, 0.2)
        // Смена на шаг 2: старый тает вверх, новый приезжает снизу
        .to(steps[0], { autoAlpha: 0, y: -26, duration: 0.55, ease: "power1.in" }, 0.88)
        .to(steps[1], { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" }, 1.02)
        .to(dotFills[1], { scaleX: 1, duration: 0.35, ease: "none" }, 1.15)
        // Шаг 3 — финальный, остаётся
        .to(steps[1], { autoAlpha: 0, y: -26, duration: 0.55, ease: "power1.in" }, 1.88)
        .to(steps[2], { autoAlpha: 1, y: 0, duration: 0.75, ease: "power2.out" }, 2.02)
        .to(dotFills[2], { scaleX: 1, duration: 0.35, ease: "none" }, 2.15);

      // Появление сцены при въезде (до пина)
      const ent = gsap.from(".ritual-head", {
        autoAlpha: 0,
        y: 40,
        duration: 1.4,
        ease: "power2.out",
        scrollTrigger: { trigger: sec, start: "top 72%", once: true },
      });

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
        ent.scrollTrigger?.kill();
        ent.kill();
        unwrapPin(sec);
      };
    });

    return () => {
      mm.revert();
      if (secRef.current) unwrapPin(secRef.current);
    };
  }, []);

  return (
    <section ref={secRef} id="ritual" className="ritual relative overflow-hidden bg-paper">
      {/* Фон-поле цветов проявляется скроллом (фоновое использование — кадр тянется на весь экран) */}
      <div ref={bgRef} className="ritual-bg" aria-hidden="true">
        <Image
          src="/photos/flower-hill.jpg"
          alt=""
          fill
          quality={85}
          sizes="100vw"
          className="object-cover"
        />
        <div className="ritual-bg-veil" />
      </div>

      <div className="ritual-pin md:flex md:h-screen md:items-center">
        <div className="u-container relative z-10 w-full py-[14vh] md:py-0">
          <div className="ritual-head text-center">
            <h2 className="section-label justify-center">
              <span className="idx">02</span>ритуал мысли
            </h2>
          </div>

          {/* Слова шагов: стопка в одной ячейке, слова перелистываются скроллом */}
          <div className="ritual-words mt-12 md:mx-auto md:mt-16 md:max-w-[760px] md:text-center">
            {STEPS.map((s) => (
              <div key={s.n} className="ritual-step ritual-reveal">
                <span className="ritual-step-num" aria-hidden="true">
                  {s.n}
                </span>
                <h3 className="ritual-step-title">{s.t}</h3>
                <p className="ritual-step-desc mx-auto">{s.d}</p>
              </div>
            ))}
          </div>

          {/* Три сегмента прогресса — заполняются скроллом (только десктоп) */}
          <div className="ritual-progress mt-12 justify-center" aria-hidden="true">
            {STEPS.map((s) => (
              <span key={s.n} className="ritual-dot">
                <span className="ritual-dot-fill" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
