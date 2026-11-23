import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  hashPassword,
  normalizeEmail,
  publicUser,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { clientIpOf, rateLimit, sameOriginOrBlock, tooManyAttempts } from "@/lib/security";

// Фиктивный хеш: когда пользователя не существует, мы всё равно выполняем
// дорогоющую проверку пароля — иначе по времени ответа можно отличить
// «нет такого аккаунта» от «неверный пароль» (timing-атака на перебор)
const DUMMY_HASH = hashPassword("mindly-timing-equalizer");

const WRONG = { ok: false, error: "Неверная почта или пароль" };

// Вход по почте и паролю: с проверкой источника, лимитами перебора
// и выравниванием времени ответа
export async function POST(req: NextRequest) {
  /* CSRF: чужой сайт не может отправить форму входа от имени пользователя */
  const blocked = sameOriginOrBlock(req);
  if (blocked) return blocked;

  /* Перебор пароля: ограничиваем попытки по IP и по почте */
  const ip = clientIpOf(req);
  const ipTry = rateLimit(`login:ip:${ip}`, 10, 5 * 60_000);
  if (!ipTry.ok) return tooManyAttempts(ipTry.retryAfterSec, "login");

  let body: { email?: unknown; password?: unknown };
  try {
    body = (await req.json()) as { email?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Нужны почта и пароль" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Нужны почта и пароль" }, { status: 400 });
  }

  const emailTry = rateLimit(`login:email:${email}`, 8, 10 * 60_000);
  if (!emailTry.ok) return tooManyAttempts(emailTry.retryAfterSec, "login");

  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      verifyPassword(password, DUMMY_HASH); // выравнивание времени ответа
      return NextResponse.json(WRONG, { status: 401 });
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(WRONG, { status: 401 });
    }

    const res = NextResponse.json({ ok: true, user: publicUser(user) });
    setSessionCookie(res, user.id);
    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Сервер не смог выполнить вход — попробуй ещё раз" },
      { status: 500 }
    );
  }
}
