"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

// ЦИФРЫ: счётчики 0→N (и один — вниз до нуля), запускаются один раз при въезде
export default function Numbers() {
  const secRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const sec = secRef.current;
    if (!sec) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Счётчики: конечные значения уже в разметке (важно для reduced-motion), тут просто прокручиваем
      const counterTweens: gsap.core.Tween[] = [];
      const counters = gsap.utils.toArray<HTMLElement>("[data-count]", sec);
      counters.forEach((el, i) => {
        const from = parseFloat(el.dataset.from ?? "0");
        const to = parseFloat(el.dataset.to ?? "0");
        el.textContent = String(from);
        const obj = { v: from };
        const tw = gsap.to(obj, {
          v: to,
          duration: 2.4,
          delay: (i % 3) * 0.18,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = String(Math.round(obj.v));
          },
          scrollTrigger: { trigger: sec, start: "top 78%", once: true },
        });
        counterTweens.push(tw);
      });

      const reveal = gsap.from(".stat", {
        autoAlpha: 0,
        y: 44,
        stagger: 0.16,
        duration: 1.3,
        ease: "power2.out",
        scrollTrigger: { trigger: sec, start: "top 80%", once: true },
      });
      const label = gsap.from(".numbers-label", {
        autoAlpha: 0,
        y: 22,
        duration: 1.1,
        ease: "power2.out",
        scrollTrigger: { trigger: sec, start: "top 82%", once: true },
      });

      return () => {
        counterTweens.forEach((t) => {
          t.scrollTrigger?.kill();
          t.kill();
        });
        reveal.scrollTrigger?.kill();
        reveal.kill();
        label.scrollTrigger?.kill();
        label.kill();
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={secRef} id="numbers" className="relative bg-paper py-[16vh]">
      <div className="u-container">
        <h2 className="section-label numbers-label">
          <span className="idx">03</span>mindly в цифрах
        </h2>
        <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
          <div className="stat">
            <div className="stat-num">
              <span data-count data-from="0" data-to="100">
                100
              </span>
              <span className="stat-suffix">%</span>
            </div>
            <p className="stat-label">
              заметок открываются и на телефоне, и на компьютере — синхронизация идёт в фоне
            </p>
          </div>
          <div className="stat">
            <div className="stat-num">
              <span data-count data-from="0" data-to="24">
                24
              </span>
              <span className="stat-slash" aria-hidden="true">
                /
              </span>
              <span data-count data-from="0" data-to="7">
                7
              </span>
            </div>
            <p className="stat-label">твои мысли рядом: утром в метро, днём на встрече, ночью на кухне</p>
          </div>
          <div className="stat">
            <div className="stat-num">
              <span data-count data-from="27" data-to="0">
                0
              </span>
            </div>
            <p className="stat-label">лишних шагов до первой записи — открыл вкладку и уже пишешь</p>
          </div>
        </div>
      </div>
    </section>
  );
}
