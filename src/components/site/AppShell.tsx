"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { toast } from "sonner";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { lenisHolder } from "@/lib/scroll";
import Preloader from "@/components/mindly/Preloader";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import AuthView from "./AuthView";
import CookieConsent from "./CookieConsent";
import HomeView from "./HomeView";
import FeaturesView from "./FeaturesView";
import NotebookApp from "@/components/notebook/NotebookApp";
import { fetchMe } from "@/components/notebook/api";
import { clearRememberCookie } from "@/lib/remember";
import type { PublicUser } from "@/components/notebook/types";

export type SiteView = "home" | "features" | "notebook";

const HASHES: Record<SiteView, string> = {
  home: "#/",
  features: "#/features",
  notebook: "#/notebook",
};

function viewFromHash(): SiteView {
  if (typeof window === "undefined") return "home";
  const h = window.location.hash;
  if (h.startsWith("#/features")) return "features";
  if (h.startsWith("#/notebook")) return "notebook";
  return "home";
}

// Окно входа и регистрации открывается поверх сайта, но адрес остаётся
// честным: #/auth/login и #/auth/register можно открыть и прямой ссылкой
function authTabFromHash(): "login" | "register" | null {
  if (typeof window === "undefined") return null;
  const h = window.location.hash;
  if (h.startsWith("#/auth/register")) return "register";
  if (h.startsWith("#/auth")) return "login";
  return null;
}

// Корневой оркестратор: вкладки продукта на единственном маршруте «/»,
// Lenis ↔ ScrollTrigger, прелоадер, сессия. Вход и регистрация — окно
// поверх текущей вкладки: сайт остаётся открытым за полупрозрачной подложкой.
export default function AppShell() {
  const [view, setView] = useState<SiteView>("home");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [authFromNotebook, setAuthFromNotebook] = useState(false);
  const [ready, setReady] = useState(false);
  // Маркетинговые вью держатся смонтированными: GSAP и SplitText мутируют их DOM,
  // поэтому размонтирование вкладок опасно — переключаем видимостью
  const [featuresMounted, setFeaturesMounted] = useState(false);
  const homeWrapRef = useRef<HTMLDivElement>(null);
  const featuresWrapRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<PublicUser | null>(null);
  // Последний «маркетинговый» вид — сайт, который живёт под окном входа
  const lastViewRef = useRef<SiteView>("home");

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /* ---------- hash-роутинг ---------- */
  const syncFromHash = useCallback(() => {
    const tab = authTabFromHash();
    const nextView = viewFromHash();

    // Адрес «#/auth/…» — окно входа поверх последнего открытого вида сайта
    if (tab) {
      // Вошедшему окно входа не нужно: нормализуем адрес и остаёмся на сайте
      if (userRef.current) {
        setAuthOpen(false);
        setView(lastViewRef.current);
        if (window.location.hash.startsWith("#/auth")) {
          window.location.hash = HASHES[lastViewRef.current];
        }
        return;
      }
      setAuthTab(tab);
      setAuthOpen(true);
      setView(lastViewRef.current);
      return;
    }
    setAuthOpen(false);

    // Блокнот требует аккаунта: без сессии показываем сайт и зовём войти
    if (nextView === "notebook" && !userRef.current) {
      setAuthFromNotebook(true);
      setAuthTab("login");
      setAuthOpen(true);
      setView(lastViewRef.current);
      return;
    }
    setAuthFromNotebook(false);
    if (nextView !== "notebook") lastViewRef.current = nextView;
    setView(nextView);
  }, []);

  useEffect(() => {
    // Первый синхронизирующий кадр — в следующем тике, без каскада рендеров
    const raf = requestAnimationFrame(syncFromHash);
    window.addEventListener("hashchange", syncFromHash);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, [syncFromHash]);

  /* ---------- сессия ---------- */
  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => {})
      .finally(() => setSessionReady(true));
  }, []);

  // Сессия готова: пересчитываем вид — «#/notebook» открывается вошедшему,
  // а гостю остаётся открытым окном входа
  useEffect(() => {
    if (!sessionReady) return;
    const t = window.setTimeout(syncFromHash, 0);
    return () => window.clearTimeout(t);
  }, [sessionReady, syncFromHash]);

  /* ---------- навигация ---------- */
  const openAuth = useCallback((tab: "login" | "register") => {
    setAuthFromNotebook(false);
    setAuthTab(tab);
    setAuthOpen(true);
    const target = tab === "register" ? "#/auth/register" : "#/auth/login";
    if (window.location.hash !== target) window.location.hash = target;
  }, []);

  const closeAuth = useCallback(() => {
    setAuthOpen(false);
    setAuthFromNotebook(false);
    // Возвращаем адрес к виду, который открыт под окном
    const target = HASHES[lastViewRef.current];
    if (window.location.hash !== target) window.location.hash = target;
  }, []);

  const navigate = useCallback(
    (to: SiteView) => {
      // Блокнот требует аккаунта: показываем окно входа поверх текущего вида
      if (to === "notebook" && !userRef.current) {
        setAuthFromNotebook(true);
        setAuthTab("login");
        setAuthOpen(true);
        setView(lastViewRef.current);
        return;
      }
      const authHash = window.location.hash.startsWith("#/auth");
      if (to === viewFromHash() && !authHash) {
        closeAuth();
        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }
      window.location.hash = HASHES[to];
    },
    [closeAuth]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* даже при сбое сети cookie истечёт сама */
    }
    clearRememberCookie(); // кука «запомнить меня» чистится вместе с сессией
    userRef.current = null;
    setUser(null);
    toast.success("Вы вышли из аккаунта — мысли остались на месте");
    // Выход из блокнота возвращаем окном входа поверх сайта
    if (window.location.hash.startsWith("#/notebook")) {
      setAuthFromNotebook(true);
      window.location.hash = "#/auth/login";
    }
  }, []);

  // После успешного входа окно закрывается: если пользователь шёл в блокнот —
  // сразу проводим его туда, иначе он остаётся на виде, открытом под окном
  const handleAuthed = useCallback(
    (u: PublicUser) => {
      userRef.current = u;
      setUser(u);
      setAuthOpen(false);
      const h = window.location.hash;
      if (h.startsWith("#/auth")) {
        setAuthFromNotebook(false);
        window.location.hash = HASHES.notebook;
      } else if (h.startsWith("#/notebook")) {
        setAuthFromNotebook(false);
        setView("notebook");
      } else if (authFromNotebook) {
        // Окно открывалось из блокнота без адреса «#/auth» — ведём в блокнот
        setAuthFromNotebook(false);
        window.location.hash = HASHES.notebook;
      }
    },
    [authFromNotebook]
  );

  /* ---------- Lenis, якоря ---------- */
  useEffect(() => {
    ScrollTrigger.config({ ignoreMobileResize: true });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let lenis: Lenis | null = null;
    let raf: ((time: number) => void) | null = null;
    if (!reduced) {
      // Обязательная связка: инерционный Lenis живёт в тикере GSAP и питает ScrollTrigger
      lenis = new Lenis({ lerp: 0.1 });
      lenisHolder.current = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      raf = (time) => lenis?.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      lenis.stop(); // на время прелоадера скролл заблокирован
    }

    // Ссылки-вкладки «#/…» переключают вид, обычные якоря — плавный скролл
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      const tabLink = el?.closest?.("a[href^='#/']") as HTMLAnchorElement | null;
      if (tabLink) {
        e.preventDefault();
        const href = tabLink.getAttribute("href") ?? "#/";
        if (href.startsWith("#/auth/")) {
          openAuth(href.includes("register") ? "register" : "login");
          return;
        }
        navigate(viewFromHash());
        return;
      }
      const anchor = el?.closest?.("a[href^='#']") as HTMLAnchorElement | null;
      if (!anchor) return;
      const hash = anchor.getAttribute("href") ?? "";
      const target = hash.length > 1 ? document.querySelector(hash) : null;
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target as HTMLElement, { duration: 1.5 });
      } else {
        target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      }
    };
    document.addEventListener("click", onClick);

    // Пересчёт триггеров после загрузки шрифтов и окна
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("load", refresh);
      if (lenis && raf) {
        gsap.ticker.remove(raf);
        lenis.destroy();
        lenisHolder.current = null;
      }
    };
  }, [navigate, openAuth]);

  /* ---------- реакция на смену вкладки ---------- */
  useEffect(() => {
    const isNotebook = view === "notebook";
    window.scrollTo(0, 0);
    document.documentElement.classList.toggle("nb-lock", isNotebook);
    // Запоминаем, что вкладку «Возможности» уже открывали — после этого она живёт скрытой
    if (view === "features") {
      const raf = requestAnimationFrame(() => setFeaturesMounted(true));
      return () => cancelAnimationFrame(raf);
    }
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 90);
    return () => window.clearTimeout(t);
  }, [view]);

  // Скролл страницы живёт только когда он нужен: во время прелоадера, под окном
  // входа и в блокноте страница заморожена — Lenis стоит, мобильный скролл заперт
  useEffect(() => {
    document.documentElement.classList.toggle("auth-modal-open", authOpen);
    const frozen = authOpen || view === "notebook" || !ready;
    if (frozen) {
      lenisHolder.current?.stop();
    } else {
      lenisHolder.current?.start();
    }
    return () => document.documentElement.classList.remove("auth-modal-open");
  }, [authOpen, view, ready]);

  // Пересчёт после монтирования «Возможностей» и переключении видимости вью
  useEffect(() => {
    if (!featuresMounted) return;
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => window.clearTimeout(t);
  }, [featuresMounted, view]);

  // Скрытым вью глушим триггеры, показанным — включаем (пины и скрабы не живут в display:none)
  useEffect(() => {
    const homeWrap = homeWrapRef.current;
    const featuresWrap = featuresWrapRef.current;
    const control = (wrap: HTMLElement | null, show: boolean) => {
      if (!wrap) return;
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger && wrap.contains(st.trigger)) {
          if (show) st.enable();
          else st.disable();
        }
      });
    };
    control(homeWrap, view === "home");
    control(featuresWrap, view === "features");
  }, [view, featuresMounted]);

  // Мягкое проявление вкладки при каждом переключении: перезапускаем CSS-анимацию
  useEffect(() => {
    const wrap = view === "home" ? homeWrapRef.current : view === "features" ? featuresWrapRef.current : null;
    if (!wrap) return;
    wrap.classList.remove("view-shell");
    // принудительный reflow — чтобы анимация переигралась
    void wrap.offsetWidth;
    wrap.classList.add("view-shell");
  }, [view, featuresMounted]);

  // Отпускаем скролл, когда прелоадер уходит (если под окном входа и в блокноте он не нужен)
  useEffect(() => {
    if (ready && !authOpen && view !== "notebook") lenisHolder.current?.start();
  }, [ready, authOpen, view]);

  const isNotebook = view === "notebook";

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="noise" aria-hidden="true" />
      {!isNotebook && (
        <SiteHeader
          view={view}
          onNav={navigate}
          user={user}
          onOpenAuth={openAuth}
          onLogout={logout}
        />
      )}
      <Preloader onDone={() => setReady(true)} />
      {/* Разрешение на куки: показывается один раз при заходе, снизу экрана */}
      <CookieConsent />
      {/* Блочный контейнер; пины ScrollTrigger не должны жить во flex-обёртке.
          Маркетинговые вью не размонтируются — GSAP мутирует их DOM, вкладки переключаются видимостью */}
      <main className="flex-1">
        <div
          ref={homeWrapRef}
          className={view === "home" ? "" : "hidden"}
          inert={view === "home" ? undefined : true}
        >
          <HomeView start={ready} user={user} onNavigate={navigate} onOpenAuth={openAuth} />
        </div>
        {featuresMounted && (
          <div
            ref={featuresWrapRef}
            className={view === "features" ? "" : "hidden"}
            inert={view === "features" ? undefined : true}
          >
            <FeaturesView />
          </div>
        )}
        {isNotebook && user && <NotebookApp user={user} onLogout={logout} />}
      </main>
      {!isNotebook && <SiteFooter onNav={navigate} onOpenAuth={openAuth} user={user} />}
      {/* Окно входа и регистрации — поверх сайта, сайт виден за подложкой */}
      {authOpen && !user && (
        <AuthView
          tab={authTab}
          onTabChange={openAuth}
          fromNotebook={authFromNotebook}
          onAuthed={handleAuthed}
          onClose={closeAuth}
        />
      )}
    </div>
  );
}
