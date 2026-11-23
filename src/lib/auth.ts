import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// Авторизация MINDLY: сессии в подписанной cookie (HMAC-SHA256),
// пароли — scrypt (встроенный crypto, без внешних зависимостей).
// ============================================================

const SECRET = process.env.AUTH_SECRET ?? "mindly-local-secret-2025-change-me";
export const SESSION_COOKIE = "mindly_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 дней

/* ---------- пароли ---------- */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/* ---------- токен сессии: header.payload.signature ---------- */

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createToken(userId: string): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(
    JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + MAX_AGE })
  );
  return `${header}.${body}.${signPayload(`${header}.${body}`)}`;
}

export function verifyToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = signPayload(`${header}.${body}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      uid?: string;
      exp?: number;
    };
    if (!payload.uid || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.uid;
  } catch {
    return null;
  }
}

/* ---------- cookie-помощники ---------- */

export function setSessionCookie(res: NextResponse, userId: string) {
  res.cookies.set(SESSION_COOKIE, createToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/* ---------- текущий пользователь ---------- */

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  provider: string;
};

export function publicUser(u: { id: string; email: string; name: string | null; provider: string }): PublicUser {
  return { id: u.id, email: u.email, name: u.name, provider: u.provider };
}

// Достаём пользователя из cookie запроса; null — если сессии нет
export async function getAuthUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const uid = verifyToken(token);
  if (!uid) return null;
  const user = await db.user.findUnique({ where: { id: uid } });
  if (!user) return null;
  return user;
}

/* ---------- валидация и нормализация ---------- */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Нормализация почты: управляющие символы и угловые скобки выбрасываются,
// пробелы по краям — тоже, адрес приводится к нижнему регистру
export function normalizeEmail(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\u0000-\u001f\u007f<>"'`\\]/g, "")
    .trim()
    .toLowerCase()
    .slice(0, 254);
}

// Имя пользователя: без управляющих символов, угловых скобок и кавычек-обёрток
export function sanitizeName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .trim()
    .slice(0, 60);
}

// Пароль принимается как есть (в хеш уходит целиком), но длину проверяем:
// слишком длинный пароль — способ уложить сервер, а не защитить аккаунт
export function isValidPassword(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  return raw.length >= 8 && raw.length <= 128;
}

// Стартовый контент нового аккаунта: две папки (одна внутри другой) и три заметки-проводника
export async function seedStarterContent(userId: string) {
  const root = await db.folder.create({
    data: { name: "Личное", userId },
  });
  const inner = await db.folder.create({
    data: { name: "Идеи и планы", userId, parentId: root.id },
  });

  const welcome = [
    "# Добро пожаловать в MINDLY",
    "",
    "Это твой блокнот в браузере. Здесь живут заметки — и **с телефоном**, и **с компьютером** они открываются одинаково.",
    "",
    "## Что попробовать прямо сейчас",
    "",
    "- [ ] Создай папку или заметку кнопками сверху слева",
    "- [ ] Кликни правой кнопкой по заметке — копия, избранное, переименование",
    "- [ ] Сделай папку внутри папки — вложенность как в проводнике",
    "- [ ] Напиши [[Идеи]] — внутренняя ссылка на другую заметку",
    "- [ ] Загляни в граф связей — кнопка «Граф» сверху",
    "- [ ] Экспортируй заметку в PDF — кнопка в шапке заметки",
    "",
    "## Шпаргалка по markdown",
    "",
    "| Синтаксис | Что получится |",
    "| --- | --- |",
    "| **текст** | жирный |",
    "| *текст* | курсив |",
    "| - пункт | список |",
    "",
    "> Совет: ссылка на репозиторий github.com/zai-org/GLM-4.5 становится живой карточкой.",
    "",
  ].join("\n");

  const ideas = [
    "# Идеи",
    "",
    "- Приложение для утренних страниц — три абзаца до кофе",
    "- Список книг, которые «когда-нибудь» — начать сегодня",
    "- Связать заметки о проектах через [[]] и посмотреть на граф",
    "",
  ].join("\n");

  const todo = [
    "# Список дел",
    "",
    "- [x] Создать аккаунт в MINDLY",
    "- [ ] Записать первую мысль",
    "- [ ] Открыть блокнот с телефона — всё уже здесь",
    "",
  ].join("\n");

  await db.note.createMany({
    data: [
      {
        title: "Добро пожаловать в MINDLY",
        content: welcome,
        userId,
        folderId: root.id,
        starred: true,
      },
      { title: "Идеи", content: ideas, userId, folderId: inner.id },
      { title: "Список дел", content: todo, userId, folderId: inner.id },
    ],
  });

  return root;
}
