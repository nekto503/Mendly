"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { IconArrowDown, IconMonitor, IconGithub, IconMarkdown, IconFile } from "../icons";

// Горизонтальная лента: секция пинится, трек уезжает по x, внутри панелей — параллакс

// Возврат секции из pin-spacer до удаления React'ом (см. CoreScene.unwrapPin)
function unwrapPin(sec: HTMLElement) {
  const spacer = sec.parentElement;
  if (spacer && spacer.classList.contains("pin-spacer")) {
    const parent = spacer.parentElement;
    if (parent) parent.insertBefore(sec, spacer);
    spacer.remove();
  }
}
const PANELS = [
  {
    n: "01",
    t: "Всё в браузере",
    d: "Телефон, компьютер, планшет — открой вкладку mindly.app и пиши. Ни установок, ни «скачай под свою ОС», ни потерянных версий файла.",
    art: IconMonitor,
  },
  {
    n: "02",
    t: "GitHub — рядом",
    d: "Вставь ссылку на репозиторий, issue или gist — она станет живой карточкой внутри заметки. Код и мысли больше не живут по разным углам.",
    art: IconGithub,
  },
  {
    n: "03",
    t: "Markdown без трения",
    d: "Решётка, дефис, кавычка — структура появляется сама, пока ты просто пишешь. Формат, который переживёт любой экспорт.",
    art: IconMarkdown,
  },
  {
    n: "04",
    t: "Файлы и PDF",
    d: "Прикрепляй документы и картинки к заметке, а когда нужно показать мир — собирай всё в аккуратный PDF одной кнопкой.",
    art: IconFile,
  },
];

export default function Tape() {
  const secRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sec = secRef.current;
    if (!sec) return;
    const mm = gsap.matchMedia();

    // Мобильный фолбэк: вертикальный стек с появлениями
    mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", () => {
      const items = gsap.utils.toArray<HTMLElement>(".tape-panel, .tape-intro", sec);
      const tweens = items.map((el) =>
        gsap.from(el, {
          autoAlpha: 0,
          y: 48,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        })
      );
      return () =>
        tweens.forEach((t) => {
          t.scrollTrigger?.kill();
          t.kill();
        });
    });

    // Десктоп: пин + горизонтальный проезд ленты
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const track = trackRef.current;
      if (!track) return;

      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const tween = gsap.to(track, {
        x: () => -dist(),
        ease: "none",
        scrollTrigger: {
          trigger: sec,
          start: "top top",
          end: () => "+=" + dist(),
          scrub: 1.5, // мягкое догоняющее сглаживание проезда
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Параллакс внутри панелей: элементы с data-hspeed плывут с разной скоростью
      const inners = gsap.utils
        .toArray<HTMLElement>("[data-hspeed]", sec)
        .map((el) => {
          const sp = parseFloat(el.dataset.hspeed ?? "0.4");
          return gsap.fromTo(
            el,
            { x: 70 * sp },
            {
              x: -70 * sp,
              ease: "none",
              scrollTrigger: {
                trigger: (el.parentElement ?? el) as HTMLElement,
                containerAnimation: tween,
                start: "left right",
                end: "right left",
                scrub: true,
              },
            }
          );
        });

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        inners.forEach((t) => {
          t.scrollTrigger?.kill();
          t.kill();
        });
        unwrapPin(sec);
      };
    });

    return () => {
      mm.revert();
      // Двойная гарантия возврата секции в родителя React после отката GSAP
      if (secRef.current) unwrapPin(secRef.current);
    };
  }, []);

  return (
    <section ref={secRef} id="tape" className="tape relative overflow-hidden bg-deep text-frost">
      <div className="tape-pin md:flex md:h-screen md:items-center">
        <div
          ref={trackRef}
          className="tape-track flex flex-col gap-8 px-[6vw] py-[12vh] md:w-max md:flex-row md:items-stretch md:gap-[5vw] md:py-0"
        >
          <div className="tape-intro flex shrink-0 flex-col justify-center md:w-[36vw]">
            <h2 className="section-label">
              <span className="idx">02</span>детали и процесс
            </h2>
            <p className="tape-title">
              Детали,
              <br />
              которые решают
            </p>
            <p className="tape-sub">
              Мелочи, из которых складывается привычка записывать: браузер вместо установки, живые ссылки вместо
              мёртвого текста, экспорт вместо скриншотов.
            </p>
            <span className="tape-cue" aria-hidden="true">
              <IconArrowDown className="h-5 w-5" />
            </span>
          </div>

          {PANELS.map((p) => (
            <article key={p.n} className="tape-panel shrink-0">
              <div className="flex items-start justify-between">
                <span className="tape-idx" aria-hidden="true">
                  {p.n}
                </span>
                <span className="tape-ico">
                  <p.art />
                </span>
              </div>
              <div>
                <h3 data-hspeed="0.25">{p.t}</h3>
                <p data-hspeed="0.5">{p.d}</p>
              </div>
            </article>
          ))}

          {/* Финальный кадр ленты: цветное стекло — разные мысли, один блокнот */}
          <article className="tape-panel tape-panel-media relative shrink-0 overflow-hidden">
            <Image
              src="/photos/paper-waves.jpg"
              alt="Красные бумажные волны — слои мыслей в одном блокноте"
              fill
              quality={88}
              sizes="(max-width: 767px) 100vw, 44vw"
              className="object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[rgba(4,21,28,0.85)] via-[rgba(4,21,28,0.15)] to-transparent"
              aria-hidden="true"
            />
            <p className="absolute bottom-8 left-8 z-10 font-mono text-[11px] uppercase tracking-[0.26em] text-white/85">
              разные мысли — один блокнот
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
