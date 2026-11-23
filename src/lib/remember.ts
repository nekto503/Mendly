"use client";

// Куки «запомнить меня»: почта, имя и пароль — только с явного разрешения
// через баннер согласия. Без согласия хранится лишь обязательная сессия,
// которую ставит сервер (httpOnly, её в куках «запоминать» не нужно).

const CONSENT_KEY = "mindly:cookie-consent";
const REMEMBER_COOKIE = "mindly_remember";
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30 дней

export type ConsentState = "granted" | "denied";

export function consentState(): ConsentState | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    return raw === "granted" || raw === "denied" ? raw : null;
  } catch {
    return null;
  }
}

export function setConsent(value: ConsentState) {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* приватный режим — просто работаем без запоминания */
  }
  if (value === "denied") clearRememberCookie();
}

export type RememberData = { email: string; name: string; password: string };

// Пишем куку только при выданном разрешении; значение кодируем, чтобы
// служебные символы не ломали заголовок Cookie
export function writeRememberCookie(data: RememberData) {
  if (consentState() !== "granted") return;
  try {
    document.cookie =
      `${REMEMBER_COOKIE}=${encodeURIComponent(JSON.stringify(data))}` +
      `; max-age=${REMEMBER_MAX_AGE}; path=/; SameSite=Lax`;
  } catch {
    /* куки недоступны — вход просто не запомнится */
  }
}

export function readRememberCookie(): RememberData | null {
  try {
    const found = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${REMEMBER_COOKIE}=`));
    if (!found) return null;
    const parsed = JSON.parse(
      decodeURIComponent(found.slice(REMEMBER_COOKIE.length + 1))
    ) as Partial<RememberData>;
    if (!parsed.email) return null;
    return {
      email: String(parsed.email),
      name: String(parsed.name ?? ""),
      password: String(parsed.password ?? ""),
    };
  } catch {
    return null;
  }
}

export function clearRememberCookie() {
  try {
    document.cookie = `${REMEMBER_COOKIE}=; max-age=0; path=/; SameSite=Lax`;
  } catch {
    /* нечего чистить */
  }
}
