"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, SplitText } from "@/lib/gsap";

// Прелоадер: счётчик 0→100, слово MINDLY собирается по буквам, «шторка» уходит вверх

// Слово через dangerouslySetInnerHTML — SplitText пересоздаёт узлы, React не должен их отслеживать
const WORD_HTML = "MINDLY";

export default function Preloader({ onDone }: { onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLParagraphElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const [gone, setGone] = useState(false);
  const onDoneRef = useRef(onDone);

  // Держим свежий колбэк в рефе — обращаться к рефе можно только вне рендера
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    // При «уменьшенном движении» оверлей прячет CSS media-query — просто отдаём сцену
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDoneRef.current();
      return;
    }
    document.documentElement.classList.add("lock-scroll");
    let split: SplitText | null = null;
    const ctx = gsap.context(() => {
      split = new SplitText(wordRef.current!, { type: "chars" });
      gsap.set(split.chars, { yPercent: 120, autoAlpha: 0 });
      const counter = { v: 0 };
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.to(split.chars, { yPercent: 0, autoAlpha: 1, duration: 0.9, stagger: 0.05, ease: "expo.out" }, 0.15)
        .from(tagRef.current, { autoAlpha: 0, y: 14, duration: 0.7 }, 0.55)
        .to(
          counter,
          {
            v: 100,
            duration: 1.55,
            ease: "power2.inOut",
            onUpdate: () => {
              if (numRef.current) numRef.current.textContent = String(Math.round(counter.v));
            },
          },
          0.2
        )
        .to(lineRef.current, { scaleX: 1, duration: 1.55, ease: "power2.inOut" }, 0.2)
        // Шторка уходит вверх мягко, без рывка — под ней уже готова hero-сцена
        .add(() => {
          document.documentElement.classList.remove("lock-scroll");
          onDoneRef.current();
        }, "+=0.2")
        .to(rootRef.current, { yPercent: -100, duration: 1.15, ease: "power3.inOut" }, "<")
        .add(() => setGone(true));
    }, rootRef);
    return () => {
      ctx.revert();
      split?.revert();
      document.documentElement.classList.remove("lock-scroll");
    };
  }, []);

  if (gone) return null;

  return (
    <div ref={rootRef} className="preloader" role="status" aria-label="Загрузка MINDLY">
      <div>
        <div ref={wordRef} className="pre-word" dangerouslySetInnerHTML={{ __html: WORD_HTML }} />
        <p ref={tagRef} className="pre-tag">
          место для твоих мыслей
        </p>
      </div>
      <div className="pre-bottom">
        <span ref={numRef} className="pre-num">
          0
        </span>
        <span className="pre-line" aria-hidden="true">
          <span ref={lineRef} />
        </span>
        <span className="pre-note">заметки живут в браузере</span>
      </div>
    </div>
  );
}
