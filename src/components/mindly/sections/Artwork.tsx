// Мини-композиции продукта: чистый CSS/SVG, без изображений и emoji
export type ArtKind = "sync" | "markdown" | "github" | "files" | "tabs" | "pdf";

export function Artwork({ kind }: { kind: ArtKind }) {
  switch (kind) {
    case "sync":
      return (
        <div className="art" aria-hidden="true">
          <div className="art-frame col w-24">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="art-ico self-start">
              <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
              <path d="M10.5 18.5h3" />
            </svg>
            <span className="fakeline w-4/5" />
            <span className="fakeline w-3/5" />
          </div>
          <div className="art-swap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="art-ico-lg">
              <path d="M4.5 11a7.5 7.5 0 0 1 12.8-4.6" />
              <path d="M19.5 13a7.5 7.5 0 0 1-12.8 4.6" />
              <path d="M17.6 2.6v3.9h-3.9" />
              <path d="M6.4 21.4v-3.9h3.9" />
            </svg>
          </div>
          <div className="art-frame col w-28">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="art-ico self-start">
              <rect x="3" y="4.5" width="18" height="12" rx="2" />
              <path d="M9 20h6" />
            </svg>
            <span className="fakeline w-3/4" />
            <span className="fakeline w-2/3" />
          </div>
        </div>
      );
    case "markdown":
      return (
        <div className="art" aria-hidden="true">
          <div className="art-frame col w-56">
            <div className="flex items-center gap-2">
              <span className="md-h-mark">#</span>
              <span className="fakeline h-2 w-1/2" />
            </div>
            <div className="flex items-center gap-2">
              <span className="md-li-dot" />
              <span className="fakeline w-2/3" />
            </div>
            <div className="flex items-center gap-2">
              <span className="md-li-dot" />
              <span className="fakeline w-1/2" />
            </div>
            <div className="flex items-center gap-2">
              <span className="md-q-mark">&gt;</span>
              <span className="fakeline w-3/4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="md-q-mark">```</span>
              <span className="fakeline w-2/5" />
            </div>
          </div>
        </div>
      );
    case "github":
      return (
        <div className="art" aria-hidden="true">
          <div className="art-frame art-gh">
            <svg viewBox="0 0 24 24" fill="currentColor" className="art-ico-lg">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
            </svg>
            <div className="flex flex-1 flex-col">
              <b>zai/mindly</b>
              <span className="sub">issue #42 · живая карточка</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="art-ico text-flame">
              <path d="M7 17L17 7" />
              <path d="M9 7h8v8" />
            </svg>
          </div>
        </div>
      );
    case "files":
      return (
        <div className="art art-files" aria-hidden="true">
          <div className="art-frame art-file-back col w-24">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="art-ico">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5" />
            </svg>
            <span className="fakeline w-2/3" />
          </div>
          <div className="art-frame col w-28">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="art-ico self-start">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5" />
            </svg>
            <span className="fakeline w-3/4" />
            <span className="fakeline w-1/2" />
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="art-ico-lg">
            <path d="M21 12.5l-8.2 8.2a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-2.8-2.8L15.6 8" />
          </svg>
        </div>
      );
    case "tabs":
      return (
        <div className="art art-tabs" aria-hidden="true">
          <span className="art-tab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="art-ico-sm">
              <path d="M3 7.5V6a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
            Идеи
          </span>
          <span className="art-tab is-on">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="art-ico-sm">
              <path d="M3 7.5V6a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2v1.5" />
              <path d="M3 7.5h17.5l-1.8 9.6a2 2 0 0 1-2 1.9H5a2 2 0 0 1-2-2z" />
            </svg>
            План
          </span>
          <span className="art-tab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="art-ico-sm">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5" />
            </svg>
            Черновик
          </span>
        </div>
      );
    case "pdf":
      return (
        <div className="art art-pdf" aria-hidden="true">
          <div className="art-frame art-sheet">
            <span className="badge">PDF</span>
            <span className="fakeline w-3/4" />
            <span className="fakeline w-full" />
            <span className="fakeline w-5/6" />
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="art-ico-lg text-flame">
            <path d="M12 4v11" />
            <path d="M8 11.5l4 4 4-4" />
            <path d="M5 20h14" />
          </svg>
        </div>
      );
  }
}
