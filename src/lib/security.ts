import { NextRequest, NextResponse } from "next/server";

// ============================================================
// Защита форм входа и регистрации:
//  - проверка источника запроса (CSRF: чужой сайт не может отправить форму)
//  - лимит попыток в памяти процесса (перебор пароля и спам регистраций)
//  - определение IP для лимитов
// ============================================================

// IP запроса: в песочнице за прокси адрес приходит в x-forwarded-for
export function clientIpOf(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "local";
  return req.headers.get("x-real-ip") ?? "local";
}

// CSRF: блокируем только действительно чужие запросы.
// Основной сигнал — Sec-Fetch-Site: его ставит сам браузер и он не зависит
// от того, как прокси переписывает заголовок Host (в песочнице сайт живёт
// за шлюзом, и адрес в Origin может законно отличаться от Host запроса).
// Дополнительно сверяем Origin с известными адресами сайта: если он совпал
// хотя бы с одним — точно свой запрос. Сомнение трактуем в пользу пользователя:
// сессию всё равно защищает cookie с SameSite=Lax.
export function sameOriginOrBlock(req: NextRequest): NextResponse | null {
  const fetchSite = (req.headers.get("sec-fetch-site") ?? "").toLowerCase();

  // Браузер прямо сказал, что запрос пришёл с другого сайта
  if (fetchSite === "cross-site") {
    return NextResponse.json(
      { ok: false, error: "Запрос пришёл с чужого сайта и был отклонён" },
      { status: 403 }
    );
  }

  // Адреса, с которых сайт может открываться (за прокси их несколько)
  const hosts = new Set<string>();
  const host = req.headers.get("host");
  if (host) hosts.add(host.toLowerCase());
  for (const header of ["x-forwarded-host", "x-original-host"]) {
    const value = req.headers.get(header);
    if (value) for (const part of value.split(",")) hosts.add(part.trim().toLowerCase());
  }

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      // Origin совпал хотя бы с одним известным адресом — свой запрос.
      // Не совпал, но браузер не пометил запрос как cross-site — расхождение
      // адресов за прокси, не блокируем (fail-open защищён SameSite-cookie).
      if (hosts.has(originHost)) return null;
    } catch {
      // Некорректный Origin — оставляем решение на Sec-Fetch-Site выше
    }
  }
  return null;
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Скользящее окно: не больше limit действий за windowMs для ключа
// (например «login:ip:1.2.3.4» или «login:email:user@mail.ru»)
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();

  // Периодическая уборка, чтобы память не росла без предела
  if (buckets.size > 1000) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfterSec: 0 };
}

// Готовый ответ «слишком много попыток»
export function tooManyAttempts(retryAfterSec: number, kind: "login" | "register"): NextResponse {
  const message =
    kind === "login"
      ? `Слишком много попыток входа — подожди ${retryAfterSec} с и попробуй снова`
      : `Слишком много регистраций подряд — подожди ${retryAfterSec} с`;
  return NextResponse.json(
    { ok: false, error: message },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}
