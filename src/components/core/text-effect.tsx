"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

/*
 * TextEffect — посимвольное (или пословное) проявление текста,
 * по API повторяет компонент из motion-primitives:
 *
 *   <TextEffect per='char' preset='fade'>Текст</TextEffect>
 *
 * Доступные пресеты: fade, blur, rise. Использовать для акцентных
 * заголовков и подписей — текст оживает по буквам при появлении в кадре.
 */

type Per = "char" | "word";
type Preset = "fade" | "blur" | "rise";

const STAGGER: Record<Per, number> = { char: 0.022, word: 0.06 };

function hiddenState(preset: Preset): { opacity: number; y?: number; filter?: string } {
  switch (preset) {
    case "blur":
      return { opacity: 0, filter: "blur(7px)" };
    case "rise":
      return { opacity: 0, y: 10 };
    default:
      return { opacity: 0 };
  }
}

type Props = {
  children: string;
  per?: Per;
  preset?: Preset;
  className?: string;
  /** секунд до начала анимации */
  delay?: number;
  /** длительность проявления одного элемента */
  duration?: number;
  /** множитель межсимвольной задержки */
  stagger?: number;
  /** запускать при появлении в кадре (по умолчанию) или сразу */
  startOnView?: boolean;
};

export function TextEffect({
  children,
  per = "word",
  preset = "fade",
  className,
  delay = 0,
  duration = 0.45,
  stagger = 1,
  startOnView = true,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px -10% 0px" });
  const started = !startOnView || inView;

  const text = typeof children === "string" ? children : String(children ?? "");
  const chunks = text.split(/(\s+)/);

  // Счётчик анимируемых элементов — пробелы не считаются, чтобы пауза не разрасталась
  let index = 0;
  const nextIndex = () => index++;

  const hidden = hiddenState(preset);

  return (
    <span ref={ref} className={className} aria-label={text} role="text">
      {chunks.map((chunk, ci) => {
        // Пробельные фрагменты оставляем как есть — переносы строк не ломаем
        if (/^\s+$/.test(chunk)) {
          return (
            <span key={`sp-${ci}`} aria-hidden="true">
              {chunk}
            </span>
          );
        }
        const chars = Array.from(chunk);
        if (per === "word") {
          const i = nextIndex();
          return (
            <motion.span
              key={`w-${ci}`}
              aria-hidden="true"
              className="inline-block will-change-transform"
              initial={hidden}
              animate={started ? { opacity: 1, y: 0, filter: "blur(0px)" } : hidden}
              transition={{
                delay: delay + i * STAGGER.word * stagger,
                duration,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {chunk}
            </motion.span>
          );
        }
        // per === "char": слово целиком неразрывное, буквы проявляются внутри
        return (
          <span key={`cw-${ci}`} aria-hidden="true" className="inline-block whitespace-pre">
            {chars.map((ch, k) => {
              const i = nextIndex();
              return (
                <motion.span
                  key={`${ci}-${k}`}
                  className="inline-block will-change-transform"
                  initial={hidden}
                  animate={started ? { opacity: 1, y: 0, filter: "blur(0px)" } : hidden}
                  transition={{
                    delay: delay + i * STAGGER.char * stagger,
                    duration,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {ch}
                </motion.span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}

export default TextEffect;
