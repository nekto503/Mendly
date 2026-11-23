"use client";

import { useEffect, useRef } from "react";
import { gsap, SplitText } from "@/lib/gsap";

// МАНИФЕСТ: слова затемнены и «зажигаются» по одному по мере скролла (scrub)

// Текст с акцентами — через dangerouslySetInnerHTML: SplitText пересоздаёт узлы,
// React не должен отслеживать детей, чтобы размонтирование не падало
const MANIFEST_HTML =
  "Твои <em>мысли</em>, <em>идеи</em> и <em>моменты</em> жизни — в одном месте. Записывай, сохраняй и " +
  "возвращайся к тому, что действительно <em>важно</em>.";

export default function Manifest() {
  const secRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();
    // Работает и на мобильных — пин не нужен, только скраб
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const sec = secRef.current;
      if (!sec) return;
      const split = new SplitText(textRef.current!, { type: "words" });
      gsap.set(split.words, { opacity: 0.14 });
      const tween = gsap.to(split.words, {
        opacity: 1,
        stagger: 0.06,
        ease: "none",
        scrollTrigger: { trigger: sec, start: "top 72%", end: "center 42%", scrub: 0.9 },
      });
      return () => {
        split.revert();
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={secRef} id="manifest" className="relative overflow-hidden bg-deep py-[16vh] text-frost">
      <div className="manifest-glow" aria-hidden="true" />
      <div className="u-container relative z-10">
        <h2 className="section-label">
          <span className="idx">01</span>манифест
        </h2>
        <p ref={textRef} className="manifest-text" dangerouslySetInnerHTML={{ __html: MANIFEST_HTML }} />
        <div className="manifest-foot">
          <p>
            MINDLY не спорит с потоком сознания: только ты, текст и тишина вокруг. Всё остальное — синхронизация,
            файлы, экспорт — работает в фоне.
          </p>
        </div>
      </div>
    </section>
  );
}
