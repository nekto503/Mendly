"use client";

// Граф связей: узлы — заметки, рёбра — [[вики-ссылки]]; детерминированная силовая раскладка

import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { buildGraph, useNotebook } from "./store";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Короткая подпись узла: длинные названия обрезаем с многоточием
const labelFor = (title: string) => {
  const clean = title.trim() || "Без названия";
  return clean.length > 22 ? `${clean.slice(0, 22)}…` : clean;
};

export default function GraphView() {
  const notes = useNotebook((s) => s.notes);
  const openNote = useNotebook((s) => s.openNote);
  const setGraph = useNotebook((s) => s.setGraph);
  const { nodes, links } = useMemo(() => buildGraph(notes), [notes]);
  const [hovered, setHovered] = useState<number | null>(null);

  // Индекс узла по id — быстрые концы рёбер
  const indexOf = useMemo(() => new Map(nodes.map((n, i) => [n.id, i])), [nodes]);

  // Раскладка: старт по окружности, затем 160 итераций отталкивания, пружин и гравитации
  const positions = useMemo(() => {
    const n = nodes.length;
    if (n === 0) return [] as { x: number; y: number }[];
    const cx = 450;
    const cy = 310;
    const pts = nodes.map((_, i) => {
      const angle = (i / n) * Math.PI * 2;
      return { x: cx + 220 * Math.cos(angle), y: cy + 220 * Math.sin(angle) };
    });
    // Вес узла от числа связей: крупные узлы движутся стабильнее
    const weight = (i: number) => 0.6 + Math.min(nodes[i].degree, 6) * 0.12;

    for (let step = 0; step < 160; step++) {
      const fx = new Array<number>(n).fill(0);
      const fy = new Array<number>(n).fill(0);

      // Кулоновское отталкивание пар узлов: сила ~ 2600 / dist^2
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
          const f = 2600 / (dist * dist);
          const ux = dx / dist;
          const uy = dy / dist;
          fx[i] += ux * f * weight(i);
          fy[i] += uy * f * weight(i);
          fx[j] -= ux * f * weight(j);
          fy[j] -= uy * f * weight(j);
        }
      }

      // Пружины по рёбрам: целевая длина 140, коэффициент 0.02
      for (const link of links) {
        const i = indexOf.get(link.source);
        const j = indexOf.get(link.target);
        if (i === undefined || j === undefined) continue;
        const dx = pts[j].x - pts[i].x;
        const dy = pts[j].y - pts[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const f = 0.02 * (dist - 140);
        const ux = dx / dist;
        const uy = dy / dist;
        fx[i] += ux * f;
        fy[i] += uy * f;
        fx[j] -= ux * f;
        fy[j] -= uy * f;
      }

      // Гравитация к центру (0.008 * dx), ограничение шага и границ поля
      for (let i = 0; i < n; i++) {
        const gx = (cx - pts[i].x) * 0.008;
        const gy = (cy - pts[i].y) * 0.008;
        const dx = clamp(gx + fx[i], -18, 18) * 0.85;
        const dy = clamp(gy + fy[i], -18, 18) * 0.85;
        pts[i].x = clamp(pts[i].x + dx, 60, 840);
        pts[i].y = clamp(pts[i].y + dy, 50, 570);
      }
    }
    return pts;
  }, [nodes, links, indexOf]);

  return (
    <div className="flex h-full w-full flex-col">
      {/* Шапка: заголовок слева, легенда и возврат справа */}
      <header className="flex items-start justify-between gap-6 px-6 pt-5">
        <div>
          <h2 className="font-display text-[18px] font-semibold text-[color:var(--nb-text)]">Граф связей</h2>
          <p className="mt-1 text-[12px] text-[color:var(--nb-muted)]">
            каждое ребро — внутренняя ссылка [[заголовок]]
          </p>
        </div>
        <div className="flex items-center gap-5 pt-1 text-[12px] text-[color:var(--nb-muted)]">
          <span className="hidden items-center gap-2 sm:flex">
            <span className="h-2 w-2 rounded-full bg-[#0593c6]" /> заметка
          </span>
          <span className="hidden items-center gap-2 sm:flex">
            <span className="h-2 w-2 rounded-full bg-[#db3996]" /> под связями
          </span>
          <button
            type="button"
            className="nb-rail-btn"
            onClick={() => setGraph(false)}
            aria-label="Вернуться к дневнику"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>к дневнику</span>
          </button>
        </div>
      </header>

      {/* Область графа */}
      <div className="relative min-h-0 w-full flex-1">
        {nodes.length === 0 ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="font-display text-[16px] text-[color:var(--nb-text)] opacity-80">
              Здесь появится карта твоих мыслей
            </p>
            <p className="text-[12px] text-[color:var(--nb-muted)]">
              Создай пару заметок и свяжи их через [[название]]
            </p>
          </div>
        ) : (
          <svg viewBox="0 0 900 620" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
            <defs>
              {/* Радиальная подсветка, чтобы фон не был пустым */}
              <radialGradient id="nbGraphGlow" cx="50%" cy="50%" r="65%">
                <stop offset="0%" stopColor="rgba(5,147,198,0.10)" />
                <stop offset="100%" stopColor="rgba(5,147,198,0)" />
              </radialGradient>
            </defs>
            <rect x={0} y={0} width={900} height={620} fill="url(#nbGraphGlow)" />

            {/* Рёбра */}
            {links.map((link) => {
              const i = indexOf.get(link.source);
              const j = indexOf.get(link.target);
              if (i === undefined || j === undefined) return null;
              const a = positions[i];
              const b = positions[j];
              if (!a || !b) return null;
              return (
                <line
                  key={`${link.source}:${link.target}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--nb-line)"
                  strokeWidth={1.2}
                />
              );
            })}

            {/* Узлы и подписи */}
            {nodes.map((node, i) => {
              const p = positions[i];
              if (!p) return null;
              const r = 10 + Math.min(node.degree * 2.5, 14);
              const isHovered = hovered === i;
              const fill = isHovered
                ? "#db3996"
                : node.degree >= 2
                  ? "rgba(219,57,150,0.85)"
                  : "rgba(5,147,198,0.85)";
              return (
                <g
                  key={node.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered((cur) => (cur === i ? null : cur))}
                  onClick={() => openNote(node.id)}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill={fill}
                    stroke={isHovered ? "#fcffff" : "none"}
                    strokeWidth={isHovered ? 1.5 : 0}
                    className="transition-all duration-200"
                  />
                  <text
                    x={p.x}
                    y={p.y + r + 14}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--nb-muted)"
                  >
                    {labelFor(node.title)}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
