"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, NotebookPen, X } from "lucide-react";
import { toast } from "sonner";
import { TextEffect } from "@/components/core/text-effect";
import { readRememberCookie, writeRememberCookie } from "@/lib/remember";
import type { PublicUser } from "@/components/notebook/types";

type Tab = "login" | "register";

type Props = {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  fromNotebook: boolean;
  onAuthed: (user: PublicUser) => void;
  onClose: () => void;
};

// Окно входа и регистрации — открывается поверх сайта, а не отдельной страницей.
// Вход — попасть в свой аккаунт, регистрация — создать новый. Единственный способ
// входа — почта и пароль, аккаунт хранится в базе на сервере и следует за тобой
// между устройствами. Если пользователь разрешил куки — форма сама заполняется
// сохранённым входом. Кнопка «на главную» стоит сразу над логотипом: выход
// на сайт всегда в одном и том же месте, у самого края окна.
export default function AuthView({ tab, onTabChange, fromNotebook, onAuthed, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Открытие окна и смена экрана — чистое состояние, затем предзаполнение из куки согласия
  useEffect(() => {
    setEmail("");
    setPassword("");
    setName("");
    setShowPw(false);
    setError(null);
    const remembered = readRememberCookie();
    if (remembered) {
      setEmail(remembered.email);
      if (remembered.name) setName(remembered.name);
      if (remembered.password) setPassword(remembered.password);
    }
    const t = window.setTimeout(() => emailRef.current?.focus(), 150);
    return () => window.clearTimeout(t);
  }, [tab]);

  // Esc закрывает окно, фокус не выходит за пределы диалога
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !cardRef.current) return;
      const focusable = cardRef.current.querySelectorAll<HTMLElement>(
        "button, input, [href], [tabindex]:not([tabindex='-1'])"
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const submitEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${tab}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        user?: PublicUser;
      } | null;
      if (!data) {
        setError("Сервер не ответил — попробуй ещё раз через минуту");
        return;
      }
      if (!res.ok || !data.ok || !data.user) {
        setError(data.error ?? "Что-то пошло не так — попробуй ещё раз");
        return;
      }
      // Разрешённые куки: запоминаем почту, имя и пароль — форма заполнится сама
      writeRememberCookie({
        email: data.user.email,
        name: data.user.name ?? "",
        password,
      });
      toast.success(tab === "login" ? "С возвращением" : "Аккаунт создан — блокнот уже ждёт");
      onAuthed(data.user);
    } catch {
      setError("Нет связи с сервером — проверь интернет и попробуй ещё раз");
    } finally {
      setBusy(false);
    }
  };

  const isLogin = tab === "login";

  return (
    <section
      className="auth-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={isLogin ? "Вход в MINDLY" : "Регистрация MINDLY"}
    >
      {/* Фон-подложка: клик по нему закрывает окно */}
      <button
        type="button"
        className="auth-overlay-backdrop"
        aria-label="Закрыть окно и вернуться на сайт"
        onClick={onClose}
        tabIndex={-1}
      />
      <div ref={cardRef} className="auth-card">
        {/* Левая панель с фото — только на десктопе */}
        <div className="auth-side relative hidden md:block" aria-hidden="true">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/photos/pink-wall.jpg)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(4,21,28,0.92)] via-[rgba(4,21,28,0.3)] to-[rgba(4,21,28,0.12)]" />
          <div className="absolute inset-x-0 bottom-0 p-8">
            <p className="font-display text-2xl italic text-paper">место для твоих мыслей</p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
              почта · пароль
            </p>
          </div>
        </div>

        {/* Правая часть: форма */}
        <div className="auth-body relative">
          {/* Выход на главную — в самом верху окна, над логотипом */}
          <div className="flex items-start justify-between gap-3">
            <button type="button" className="auth-back" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" /> на главную
            </button>
            <button
              type="button"
              className="auth-close"
              onClick={onClose}
              aria-label="Закрыть окно"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="logo">
            MINDLY
            <span className="logo-dot" aria-hidden="true" />
          </p>

          {fromNotebook && (
            <p className="mt-3 flex items-start gap-2.5 rounded-xl border border-[rgba(219,57,150,0.28)] bg-[rgba(219,57,150,0.07)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[color:rgba(var(--ink-rgb),0.75)]">
              <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-[#db3996]" />
              <span>
                Блокнот открывается после входа: так заметки синхронизируются между телефоном и
                компьютером и остаются только твоими.
              </span>
            </p>
          )}

          <h3 className="font-display text-[1.9rem] font-bold leading-tight">
            <TextEffect per="char" preset="fade" duration={0.32} stagger={0.6}>
              {isLogin ? "Вход в свой аккаунт" : "Создать свой аккаунт"}
            </TextEffect>
          </h3>
          <p className="mt-1.5 text-sm text-[color:rgba(var(--ink-rgb),0.6)]">
            {isLogin
              ? "Заметки ждут там же, где ты их оставил."
              : "Полминуты — и первое место для мысли готово."}
          </p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={submitEmail}>
            {tab === "register" && (
              <label className="auth-field">
                <span>как обращаться</span>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={60}
                  className="auth-input"
                  placeholder="Как к тебе обращаться"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            <label className="auth-field">
              <span>почта</span>
              <input
                ref={emailRef}
                type="email"
                required
                maxLength={254}
                className="auth-input"
                placeholder="Введите почту"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="auth-field">
              <span>пароль</span>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  maxLength={128}
                  className="auth-input pr-11"
                  placeholder={tab === "register" ? "Минимум 8 символов" : "Твой пароль"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:rgba(var(--ink-rgb),0.45)] hover:text-ink"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPw ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </label>
            {error && <p className="text-sm font-medium text-[#c22e63]">{error}</p>}
            <button type="submit" className="btn btn-flame w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isLogin ? "Войти" : "Создать аккаунт"}
            </button>
          </form>

          {/* Перекрёстные ссылки между экранами — сразу под главной кнопкой */}
          <p className="mt-4 text-center text-sm text-[color:rgba(var(--ink-rgb),0.65)]">
            {isLogin ? "У вас нет аккаунта? " : "Уже есть аккаунт? "}
            <button
              type="button"
              className="font-semibold text-[#db3996] underline-offset-4 hover:underline"
              onClick={() => onTabChange(isLogin ? "register" : "login")}
            >
              {isLogin ? "Регистрация" : "Войти"}
            </button>
          </p>

          <p className="mt-6 text-right text-xs leading-relaxed text-[color:rgba(var(--ink-rgb),0.5)]">
            Пароли хранятся в виде хешей,<br />заметки — только твои.
          </p>
        </div>
      </div>
    </section>
  );
}
