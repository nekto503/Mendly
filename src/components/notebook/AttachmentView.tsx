"use client";

import { useEffect, useMemo } from "react";
import { Download, FileText } from "lucide-react";
import { useNotebook } from "./store";

// Просмотр вложения во вкладке: картинка, текст или код + скачивание
export default function AttachmentView({ id }: { id: string }) {
  const attachment = useNotebook((s) => s.attachments.find((a) => a.id === id));
  const notes = useNotebook((s) => s.notes);
  const openNote = useNotebook((s) => s.openNote);

  const isImage = !!attachment?.mime.startsWith("image/");
  const blobUrl = useMemo(() => {
    if (!attachment || isImage) return null;
    return URL.createObjectURL(new Blob([attachment.data], { type: attachment.mime }));
  }, [attachment, isImage]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (!attachment) {
    return <p className="nb-empty p-10">Вложение не найдено — возможно, оно было удалено.</p>;
  }

  const hostNote = attachment.noteId ? notes.find((n) => n.id === attachment.noteId) : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="nb-note-head">
        <div className="min-w-0 flex-1">
          <p className="nb-breadcrumb">вложение · {attachment.mime}</p>
          <h2 className="truncate font-display text-xl font-bold">{attachment.name}</h2>
        </div>
        <a
          className="nb-icon-btn"
          href={isImage ? attachment.data : (blobUrl ?? "#")}
          download={attachment.name}
          aria-label={`Скачать ${attachment.name}`}
          title="Скачать"
        >
          <Download className="h-4 w-4" />
        </a>
      </div>

      <div className="nb-scroll min-h-0 flex-1 overflow-auto p-6">
        {isImage ? (
          <div className="flex items-start justify-center">
            { }
            <img
              src={attachment.data}
              alt={attachment.name}
              className="max-h-[70vh] max-w-full rounded-xl border border-[color:var(--nb-line)] object-contain"
            />
          </div>
        ) : (
          <pre className="nb-code-view">{attachment.data || "Пустой файл."}</pre>
        )}
        {hostNote && (
          <button
            type="button"
            className="nb-link-row mt-6 inline-flex"
            onClick={() => openNote(hostNote.id)}
          >
            <FileText className="h-3.5 w-3.5" /> в заметке: {hostNote.title}
          </button>
        )}
      </div>
    </div>
  );
}
