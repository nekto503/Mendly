"use client";

import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { consentState, setConsent } from "@/lib/remember";

// Баннер согласия: показывается один раз при заходе, снизу экрана.
// «Разрешить» — почта, имя и пароль запоминаются в куке для автозаполнения.
// «Не сейчас» — работает только обязательная сессия сервера.
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Небольшая пауза: баннер не должен мешать первым кадрам прелоадера
    const t = window.setTimeout(() => {
      if (!consentState()) setVisible(true);
    }, 1100);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  const decide = (value: "granted" | "denied") => {
    setConsent(value);
    setVisible(false);
  };

  return (
    <div className="cookie-consent" role="dialog" aria-label="Разрешение на куки">
      <span className="cookie-ico" aria-hidden="true">
        <Cookie className="h-4 w-4" />
      </span>
      <p>
        Сайт использует cookie-файлы, чтобы сделать ваше пребывание на нем максимально удобным.
        Оставаясь на сайте, вы даёте своё согласие на использование cookie-файлов
      </p>
      <div className="cookie-actions">
        <button type="button" className="btn btn-flame" onClick={() => decide("granted")}>
          Разрешить
        </button>
        <button type="button" className="btn btn-ghost-inv" onClick={() => decide("denied")}>
          Не сейчас
        </button>
      </div>
    </div>
  );
}
