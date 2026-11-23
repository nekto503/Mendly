"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { Artwork } from "./Artwork";
import type { ArtKind } from "../Artwork";
import { IconFolder, IconFolderOpen, IconFile, IconGithub, IconPen } from "../icons";

// Четыре фазы продукта: синхронизация → markdown → вложения → вкладки и PDF
const PHASES = [
  {
    n: "01",
    t: "Синхронизация",
    d: "Начни на телефоне — продолжи на компьютере. Заметки живут в облаке и открываются в браузере на любом устройстве, без установки приложений.",
  },
  {
    n: "02",
    t: "Markdown",
    d: "Заголовки, списки, цитаты и код — форматирование как в markdown. Синтаксис, который понимают и редактор, и GitHub.",
  },
  {
    n: "03",
    t: "Вложения",
    d: "Прикрепляй к заметке документы, картинки и ссылки — всё нужное лежит рядом с текстом, в одной карточке.",
  },
  {
    n: "04",
    t: "Вкладки и PDF",
    d: "Открытые заметки показываются сверху — как папки в браузере. Переключайся мгновенно и экспортируй в аккуратный PDF.",
  },
];

const PHASE_ART: ArtKind[] = ["sync", "markdown", "files", "pdf"];

// Центр тяжести элемента относительно предка: offset* не зависит от transform — надёжно при resize
function centerIn(el: HTMLElement, ancestor: HTMLElement) {
  let x = el.offsetLeft + el.offsetWidth / 2;
  let y = el.offsetTop + el.offsetHeight / 2;
  let p = el.offsetParent as HTMLElement | null;
  while (p && p !== ancestor) {
    x += p.offsetLeft;
    y += p.offsetTop;
    p = p.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

// ЯДРО СКРОЛЛИТЕЛЛИНГА: закреплённая сцена на ~300vh. Визуал перестраивается скроллом:
// заметка перелетает с телефона в окно, markdown «рендерится», всплывают вложения,
// затем подсвечиваются вкладки-папки и выезжает PDF — картина собирается целиком.

// Перед удалением секции React'ом нужно вернуть её из pin-spacer в исходного родителя:
// ScrollTrigger оборачивает секцию в див-обёртку, и removeChild у React падает.
function unwrapPin(sec: HTMLElement) {
  const spacer = sec.parentElement;
  if (spacer && spacer.classList.contains("pin-spacer")) {
    const parent = spacer.parentElement;
    if (parent) parent.insertBefore(sec, spacer);
    spacer.remove();
  }
}
export default function CoreScene() {
  const secRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);
  const phoneNoteRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const glowBRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sec = secRef.current;
    if (!sec) return;
    const mm = gsap.matchMedia();

    // Мобильные (и уменьшенное движение целиком): вертикальный стек с лёгкими появлениями
    mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", () => {
      const items = gsap.utils.toArray<HTMLElement>(".phase-txt", sec);
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

    // Десктоп: пин + скраб, все движения только transform/opacity
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const stage = stageRef.current;
      const body = bodyRef.current;
      const fly = flyRef.current;
      if (!stage || !body || !fly) return;

      sec.classList.add("is-full");

      // Начальные состояния до первого кадра — без «скачка» контента
      gsap.set(".md-out .blk", { autoAlpha: 0, y: 18 });
      gsap.set(".chip", { autoAlpha: 0, scale: 0.6, y: 10 });
      gsap.set(".phase-txt:not(:first-child)", { autoAlpha: 0 });
      gsap.set(".dot-fill", { scaleX: 0 });
      gsap.set(glowBRef.current, { opacity: 0.15 });

      // Куда перелетает заметка с экрана телефона
      const flyTo = () => {
        const t = centerIn(body, stage);
        const s = centerIn(fly, stage);
        return { x: t.x - s.x, y: t.y - s.y - body.offsetHeight * 0.16 };
      };

      const dotFills = gsap.utils.toArray<HTMLElement>(".dot-fill", sec);
      const txts = gsap.utils.toArray<HTMLElement>(".phase-txt", sec);

      const tl = gsap.timeline({
        defaults: { ease: "power1.inOut" },
        scrollTrigger: {
          trigger: sec,
          start: "top top",
          end: "+=300%",
          scrub: 1.6, // долгое сглаживание — фазы перетекают одна в другую
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // Финальная фаза: подсветка вкладок-папок через класс (цвет — CSS, движение — timeline)
            sec.classList.toggle("phase-4", self.progress > 0.76);
          },
        },
      });

      tl
        // Фаза 1: заметка отделяется от телефона и влетает в окно браузера
        .to(fly, { autoAlpha: 1, duration: 0.12 }, 0.04)
        .to(fly, { x: () => flyTo().x, y: () => flyTo().y, scale: 0.52, duration: 0.8 }, 0.16)
        .to(fly, { autoAlpha: 0, scale: 0.32, duration: 0.25 }, 0.96)
        .to(phoneNoteRef.current, { autoAlpha: 0.35, duration: 0.35 }, 0.96)
        .to(dotFills[0], { scaleX: 1, duration: 0.3, ease: "none" }, 0.08)
        // Фаза 2: markdown «рендерится» в красивый текст
        .to(stage, { scale: 1.03, duration: 0.6 }, 1.0)
        .to(".md-out .blk", { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.45, ease: "power2.out" }, 1.18)
        .to(dotFills[1], { scaleX: 1, duration: 0.3, ease: "none" }, 1.08)
        // Фаза 3: всплывают вложения — файлы и GitHub-ссылка
        .to(stage, { scale: 1, duration: 0.6 }, 2.0)
        .to(".chip", { autoAlpha: 1, scale: 1, y: 0, stagger: 0.14, duration: 0.5, ease: "back.out(1.4)" }, 2.12)
        .to(dotFills[2], { scaleX: 1, duration: 0.3, ease: "none" }, 2.08)
        // Фаза 4: выезжает PDF, сцена собирается в единую картину
        .fromTo(
          pdfRef.current,
          { autoAlpha: 0, x: 48, y: 26, rotate: 10 },
          { autoAlpha: 1, x: 0, y: 0, rotate: -7, duration: 0.55, ease: "power3.out" },
          3.12
        )
        .to(glowBRef.current, { opacity: 0.95, duration: 0.6 }, 3.35)
        .to(stage, { scale: 0.985, duration: 0.6 }, 3.5)
        .to(dotFills[3], { scaleX: 1, duration: 0.3, ease: "none" }, 3.08);

      // Смена номера/заголовка/описания фазы: окна перекрываются — старый блок мягко тает вверх,
      // новый начинает приезжать снизу ещё до того, как старый исчез
      [[0, 1, 1], [1, 2, 2], [2, 3, 3]].forEach(([a, b, at]) => {
        tl.to(txts[a], { autoAlpha: 0, y: -20, duration: 0.6, ease: "power1.in" }, at - 0.32);
        tl.fromTo(
          txts[b],
          { autoAlpha: 0, y: 20 },
          { autoAlpha: 1, y: 0, duration: 0.65, ease: "power2.out" },
          at + 0.08
        );
      });

      // Появление сцены при въезде в секцию (до пина)
      const ent = gsap.from(".core-stage-wrap", {
        autoAlpha: 0,
        y: 64,
        duration: 1.4,
        ease: "power2.out",
        scrollTrigger: { trigger: sec, start: "top 70%", once: true },
      });

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
        ent.scrollTrigger?.kill();
        ent.kill();
        sec.classList.remove("is-full");
        sec.classList.remove("phase-4");
        unwrapPin(sec);
      };
    });

    return () => {
      mm.revert();
      // Двойная гарантия: после полного отката GSAP секция обязана вернуться в родителя React
      if (secRef.current) unwrapPin(secRef.current);
    };
  }, []);

  return (
    <section ref={secRef} id="core" className="core relative overflow-hidden bg-paper">
      <div className="core-glow-a" aria-hidden="true" />
      <div ref={glowBRef} className="core-glow-b" aria-hidden="true" />
      <div className="core-inner u-container py-[10vh] md:py-0">
        <div className="core-grid">
          <div className="core-info">
            <h2 className="section-label">
              <span className="idx">01</span>как это работает
            </h2>
            <div className="phase-stack">
              {PHASES.map((p, i) => (
                <div key={p.n} className="phase-txt">
                  <span className="phase-num" aria-hidden="true">
                    {p.n}
                  </span>
                  <h3 className="phase-title">{p.t}</h3>
                  <p className="phase-desc">{p.d}</p>
                  <div className="phase-art">
                    <Artwork kind={PHASE_ART[i]} />
                  </div>
                </div>
              ))}
            </div>
            <div className="phase-dots" aria-hidden="true">
              {PHASES.map((p) => (
                <span key={p.n} className="dot">
                  <span className="dot-fill" />
                </span>
              ))}
            </div>
          </div>

          {/* Закреплённый визуал: только на десктопе */}
          <div className="core-stage-wrap hidden md:block">
            <div ref={stageRef} className="core-stage" aria-hidden="true">
              <div className="stage-browser">
                <div className="stage-tabs">
                  <span className="tab">
                    <IconFolderOpen />
                    Идеи
                  </span>
                  <span className="tab">
                    <IconFolder />
                    План
                  </span>
                  <span className="tab">
                    <IconFile />
                    Черновик
                  </span>
                </div>
                <div className="stage-bar">
                  <span className="bar-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="url">mindly.app/мысли</span>
                </div>
                <div ref={bodyRef} className="stage-body">
                  <div className="md-grid">
                    <div className="md-src">
                      <span># Идеи на неделю</span>
                      <span>- записать подкаст</span>
                      <span>- купить кофе</span>
                      <span>&gt; github.com/zai/mindly</span>
                      <span>```js</span>
                      <span>keep(true)</span>
                    </div>
                    <div className="md-out">
                      <div className="blk md-h">Идеи на неделю</div>
                      <div className="blk md-li">записать подкаст</div>
                      <div className="blk md-li">купить кофе</div>
                      <div className="blk md-quote">
                        <IconGithub className="h-3.5 w-3.5" />
                        zai/mindly — живая карточка
                      </div>
                      <div className="blk md-code">keep(true)</div>
                    </div>
                  </div>
                  <div className="stage-chips">
                    <span className="chip">
                      <IconFile className="h-3.5 w-3.5" />
                      инсайт.pdf
                    </span>
                    <span className="chip">
                      <IconFile className="h-3.5 w-3.5" />
                      мудборд.png
                    </span>
                    <span className="chip gh">
                      <IconGithub className="h-3.5 w-3.5" />
                      zai/mindly#42
                    </span>
                  </div>
                </div>
              </div>

              <div className="stage-phone">
                <span className="phone-notch" />
                <div ref={phoneNoteRef} className="phone-note">
                  <span className="pn-title">
                    <IconPen className="h-3 w-3" />
                    новая заметка
                  </span>
                  <span className="fakeline w-4/5" />
                  <span className="fakeline w-3/5" />
                  <span className="fakeline w-2/3" />
                </div>
              </div>

              {/* Клон заметки, который перелетает с телефона в окно */}
              <div ref={flyRef} className="fly-note">
                <span className="fakeline w-4/5" />
                <span className="fakeline w-3/5" />
                <span className="fakeline w-2/3" />
              </div>

              <div ref={pdfRef} className="stage-pdf">
                <span className="pdf-badge">PDF</span>
                <span className="fakeline w-3/4" />
                <span className="fakeline w-full" />
                <span className="fakeline w-5/6" />
                <span className="fakeline w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
