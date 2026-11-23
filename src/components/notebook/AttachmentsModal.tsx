"use client";

// Модалка вложений: создание (текст, код, картинка) и список уже сохранённых

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileCode2,
  FileText,
  Image,
  Paperclip,
  SquareArrowOutUpRight,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { editorInsert, useNotebook } from "./store";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type AttachKind = "text" | "code" | "image";

type PickedImage = { name: string; size: number; mime: string };

// Тип содержимого: сегментный контрол формы
const KINDS: { value: AttachKind; label: string; icon: LucideIcon }[] = [
  { value: "text", label: "Текст", icon: FileText },
  { value: "code", label: "Код", icon: FileCode2 },
  { value: "image", label: "Картинка", icon: Image },
];

const MAX_IMAGE_BYTES = 400 * 1024; // клиентский лимит 400 КБ

export default function AttachmentsModal() {
  const attachModalOpen = useNotebook((s) => s.attachModalOpen);
  const setAttachModal = useNotebook((s) => s.setAttachModal);
  const notes = useNotebook((s) => s.notes);
  const attachments = useNotebook((s) => s.attachments);
  const createAttachment = useNotebook((s) => s.createAttachment);
  const openAttachment = useNotebook((s) => s.openAttachment);
  const deleteAttachment = useNotebook((s) => s.deleteAttachment);

  // Активная заметка — та, в которую при желании вставим ссылку на вложение
  const activeNote = useNotebook((s) => {
    const t = s.tabs.find((x) => x.key === s.activeKey);
    return t && t.kind === "note" && t.id ? (s.notes.find((n) => n.id === t.id) ?? null) : null;
  });

  const [name, setName] = useState("");
  const [kind, setKind] = useState<AttachKind>("text");
  const [content, setContent] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [insertLink, setInsertLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetForm = useCallback(() => {
    setName("");
    setKind("text");
    setContent("");
    setImageData(null);
    setPicked(null);
    setError(null);
    setBusy(false);
  }, []);

  // По открытию: чистая форма; чекбокс вставки ссылки доступен только при открытой заметке
  useEffect(() => {
    if (!attachModalOpen) return;
    resetForm();
    const st = useNotebook.getState();
    const t = st.tabs.find((x) => x.key === st.activeKey);
    const note =
      t && t.kind === "note" && t.id ? (st.notes.find((n) => n.id === t.id) ?? null) : null;
    setInsertLink(note !== null);
  }, [attachModalOpen, resetForm]);

  // Escape закрывает модалку независимо от фокуса
  useEffect(() => {
    if (!attachModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAttachModal(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [attachModalOpen, setAttachModal]);

  // Заголовки заметок для подписи «в заметке …»
  const noteTitles = useMemo(() => new Map(notes.map((n) => [n.id, n.title])), [notes]);

  // Выбор картинки: FileReader → dataURL, лимит 400 КБ по исходному файлу
  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0] ?? null;
    input.value = ""; // чтобы можно было выбрать тот же файл повторно
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setImageData(null);
      setPicked(null);
      setError("Картинка больше 400 КБ — выбери поменьше");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setImageData(result);
      setPicked({ name: file.name, size: file.size, mime: file.type || "image/png" });
      setError(null);
    };
    reader.onerror = () => {
      setImageData(null);
      setPicked(null);
      setError("Не удалось прочитать файл — попробуй другой");
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Введи имя файла — например «смета.txt»");
      return;
    }
    if (kind === "image" && !imageData) {
      setError("Сначала выбери картинку — до 400 КБ");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const mime = kind === "image" ? (picked?.mime || "image/png") : "text/plain";
      await createAttachment({
        name: trimmed,
        mime,
        content: kind === "image" ? (imageData ?? "") : content,
        noteId: activeNote?.id ?? null,
      });
      if (insertLink && activeNote) editorInsert(`[[file:${trimmed}]]`);
      toast.success(`«${trimmed}» — вложение сохранено`);
      resetForm();
      setAttachModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось сохранить вложение";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  if (!attachModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm"
      onMouseDown={() => setAttachModal(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Вложение"
        className="mx-auto mt-[8vh] max-h-[86vh] w-[min(560px,94vw)] overflow-y-auto rounded-2xl border border-[color:var(--nb-line)] bg-[color:var(--nb-panel)] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[color:var(--nb-line)] bg-[color:var(--nb-panel)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Paperclip className="h-4 w-4 text-[#db3996]" />
            <h2 className="font-display text-[16px] font-semibold text-[color:var(--nb-text)]">Вложение</h2>
          </div>
          <button
            type="button"
            onClick={() => setAttachModal(false)}
            aria-label="Закрыть"
            className="rounded-lg p-1.5 text-[color:var(--nb-muted)] transition-colors hover:bg-[color:var(--nb-hover)] hover:text-[color:var(--nb-text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Форма создания */}
        <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
          <div className="space-y-1.5">
            <Label
              htmlFor="att-name"
              className="text-[12px] font-medium text-[color:var(--nb-muted)]"
            >
              Имя файла
            </Label>
            <Input
              id="att-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="смета.txt"
              autoComplete="off"
              spellCheck={false}
              className="border-[color:var(--nb-line)] bg-[color:var(--nb-hover)] text-[14px] text-[color:var(--nb-text)] placeholder:text-[color:var(--nb-faint)]"
            />
          </div>

          {/* Тип содержимого */}
          <div className="flex gap-1 rounded-xl border border-[color:var(--nb-line)] bg-[color:var(--nb-hover)] p-1">
            {KINDS.map((k) => {
              const Icon = k.icon;
              const isActiveKind = kind === k.value;
              return (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setKind(k.value)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                    isActiveKind
                      ? "bg-[color:var(--nb-hover)] text-[color:var(--nb-text)]"
                      : "text-[color:var(--nb-muted)] hover:text-[color:var(--nb-text)]"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {k.label}
                </button>
              );
            })}
          </div>

          {kind === "image" ? (
            <div className="space-y-3">
              {/* Зона загрузки картинки */}
              <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-[color:var(--nb-line)] border-dashed bg-[color:var(--nb-hover)] px-4 py-5 text-center transition-colors hover:border-[#db3996]/60">
                <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                <Upload className="h-4 w-4 text-[color:var(--nb-muted)]" />
                <span className="text-[13px] text-[color:var(--nb-text)] opacity-90">Выбрать файл</span>
                <span className="text-[11px] text-[color:var(--nb-faint)]">
                  PNG, JPG, WEBP — до 400 КБ
                </span>
              </label>

              {picked && imageData && (
                <div className="flex items-center gap-3 rounded-xl border border-[color:var(--nb-line)] bg-[color:var(--nb-hover)] p-3">
                  <img
                    src={imageData}
                    alt={picked.name}
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-[color:var(--nb-text)]">{picked.name}</p>
                    <p className="text-[11px] text-[color:var(--nb-faint)]">
                      {(picked.size / 1024).toFixed(1)} КБ
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Textarea
              rows={7}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="содержимое файла…"
              className={cn(
                "min-h-[168px] border-[color:var(--nb-line)] bg-[color:var(--nb-hover)] text-[14px] text-[color:var(--nb-text)] placeholder:text-[color:var(--nb-faint)]",
                kind === "code" && "font-mono"
              )}
            />
          )}

          {/* Вставить ссылку в открытую заметку — только если заметка открыта */}
          {activeNote && (
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="att-insert"
                checked={insertLink}
                onCheckedChange={(v) => setInsertLink(v === true)}
                className="border-[color:var(--nb-line)] data-[state=checked]:border-[#db3996] data-[state=checked]:bg-[#db3996]"
              />
              <Label
                htmlFor="att-insert"
                className="cursor-pointer text-[13px] font-normal text-[color:var(--nb-text)] opacity-90"
              >
                Вставить ссылку в открытую заметку
              </Label>
            </div>
          )}

          {/* Кнопка сохранения и ошибка */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-[#db3996] px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#c92e86] disabled:opacity-60"
            >
              {busy ? "Сохраняю…" : "Сохранить вложение"}
            </button>
          </div>
          {error && <p className="text-[12px] text-[#ff7ab0]">{error}</p>}
        </form>

        {/* Уже сохранённые вложения */}
        <div className="border-t border-[color:var(--nb-line)] px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--nb-faint)]">
            Уже сохранённые
          </p>
          {attachments.length === 0 ? (
            <p className="mt-2 text-[13px] text-[color:var(--nb-muted)]">
              Вложений пока нет — они появятся здесь
            </p>
          ) : (
            <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {attachments.map((a) => {
                const Icon = a.mime.startsWith("image/") ? Image : FileText;
                const noteTitle = a.noteId ? (noteTitles.get(a.noteId) ?? null) : null;
                return (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl border border-[color:var(--nb-line)] bg-[color:var(--nb-hover)] px-3 py-2"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[color:var(--nb-muted)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-[color:var(--nb-text)]">{a.name}</p>
                      <p className="text-[11px] text-[color:var(--nb-faint)]">
                        {(a.size / 1024).toFixed(1)} КБ
                        {noteTitle ? ` · в заметке «${noteTitle}»` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAttachment(a.id)}
                      aria-label={`Открыть ${a.name}`}
                      title="Открыть вложение"
                      className="rounded-lg p-1.5 text-[color:var(--nb-muted)] transition-colors hover:bg-[color:var(--nb-hover)] hover:text-[color:var(--nb-text)]"
                    >
                      <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Удалить вложение «${a.name}»?`)) void deleteAttachment(a.id);
                      }}
                      aria-label={`Удалить ${a.name}`}
                      title="Удалить вложение"
                      className="rounded-lg p-1.5 text-[#ff7ab0] transition-colors hover:bg-[#ff7ab0]/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
