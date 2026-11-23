import type { SVGProps } from "react";

// Штриховые иконки (stroke 1.8, без emoji) — единый стиль интерфейса MINDLY
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

type P = SVGProps<SVGSVGElement>;

export const IconSpark = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M12 3.5l1.7 4.9 4.8 1.6-4.8 1.6L12 16.5l-1.7-4.9L5.5 10l4.8-1.6z" />
    <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
  </svg>
);

export const IconArrowDown = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M12 5v14" />
    <path d="M6 13l6 6 6-6" />
  </svg>
);

export const IconArrowUpRight = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M7 17L17 7" />
    <path d="M9 7h8v8" />
  </svg>
);

export const IconPhone = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
    <path d="M10.5 18.5h3" />
  </svg>
);

export const IconMonitor = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <rect x="3" y="4.5" width="18" height="12" rx="2" />
    <path d="M9 20h6" />
    <path d="M12 16.5V20" />
  </svg>
);

export const IconSync = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M4.5 11a7.5 7.5 0 0 1 12.8-4.6" />
    <path d="M19.5 13a7.5 7.5 0 0 1-12.8 4.6" />
    <path d="M17.6 2.6v3.9h-3.9" />
    <path d="M6.4 21.4v-3.9h3.9" />
  </svg>
);

export const IconMarkdown = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="M6.5 15V9l3 3.5L12.5 9v6" />
    <path d="M17.5 9v6" />
    <path d="M15 12.5l2.5 2.5 2.5-2.5" />
  </svg>
);

export const IconGithub = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...p}>
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
  </svg>
);

export const IconPaperclip = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M21 12.5l-8.2 8.2a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-2.8-2.8L15.6 8" />
  </svg>
);

export const IconFile = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 16.5h4" />
  </svg>
);

export const IconFolder = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M3 7.5V6a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

export const IconFolderOpen = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M3 7.5V6a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2v1.5" />
    <path d="M3 7.5h17.5l-1.8 9.6a2 2 0 0 1-2 1.9H5a2 2 0 0 1-2-2z" />
  </svg>
);

export const IconDownload = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M12 4v11" />
    <path d="M8 11.5l4 4 4-4" />
    <path d="M5 20h14" />
  </svg>
);

export const IconPen = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M4 20l4.5-1L20 7.5 16.5 4 5 15.5z" />
    <path d="M14 6.5l3.5 3.5" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M4.5 12.5l5 5L19.5 7" />
  </svg>
);
