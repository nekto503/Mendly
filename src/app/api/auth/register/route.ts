import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  EMAIL_RE,
  hashPassword,
  isValidPassword,
  normalizeEmail,
  publicUser,
  sanitizeName,
  seedStarterContent,
  setSessionCookie,
} from "@/lib/auth";
import { clientIpOf, rateLimit, sameOriginOrBlock, tooManyAttempts } from "@/lib/security";

// Регистрация по почте: проверка источника, лимиты, нормализация ввода —
// и только после этого аккаунт, стартовые заметки и сессия
export async function POST(req: NextRequest) {
  /* CSRF: чужой сайт не может создать аккаунт от имени пользователя */
  const blocked = sameOriginOrBlock(req);
  if (blocked) return blocked;

  /* Спам регистрациями: ограничиваем и по IP, и по адресу почты */
  const ip = clientIpOf(req);
  const ipTry = rateLimit(`register:ip:${ip}`, 5, 60 * 60_000);
  if (!ipTry.ok) return tooManyAttempts(ipTry.retryAfterSec, "register");

  let body: { email?: unknown; password?: unknown; name?: unknown };
  try {
    body = (await req.json()) as { email?: unknown; password?: unknown; name?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Проверь форму — что-то не так" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const name = sanitizeName(body.name);
  const password = typeof body.password === "string" ? body.password : "";

  const emailTry = rateLimit(`register:email:${email}`, 3, 60 * 60_000);
  if (!emailTry.ok) return tooManyAttempts(emailTry.retryAfterSec, "register");

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ ok: false, error: "Проверь адрес — похоже, опечатка" }, { status: 400 });
  }
  if (name.length < 2) {
    return NextResponse.json(
      { ok: false, error: "Напиши, как к тебе обращаться — хотя бы два символа" },
      { status: 400 }
    );
  }
  if (!isValidPassword(password)) {
    return NextResponse.json(
      { ok: false, error: "Пароль нужен надёжнее — от 8 до 128 символов" },
      { status: 400 }
    );
  }

  try {
    const exists = await db.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { ok: false, error: "Такая почта уже зарегистрирована — попробуй войти" },
        { status: 409 }
      );
    }

    const user = await db.user.create({
      data: {
        email,
        name: name || null,
        passwordHash: hashPassword(password),
        provider: "email",
      },
    });

    await seedStarterContent(user.id);

    const res = NextResponse.json({ ok: true, user: publicUser(user) });
    setSessionCookie(res, user.id);
    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Сервер не смог создать аккаунт — попробуй ещё раз" },
      { status: 500 }
    );
  }
}
