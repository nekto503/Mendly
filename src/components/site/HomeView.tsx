"use client";

import Hero from "@/components/mindly/sections/Hero";
import Manifest from "@/components/mindly/sections/Manifest";
import Ritual from "@/components/mindly/sections/Ritual";
import Numbers from "@/components/mindly/sections/Numbers";
import Moments from "@/components/mindly/sections/Moments";
import Finale from "@/components/mindly/sections/Finale";
import type { PublicUser } from "@/components/notebook/types";
import type { SiteView } from "./AppShell";

type Props = {
  start: boolean;
  user: PublicUser | null;
  onNavigate: (v: SiteView) => void;
  onOpenAuth: (tab: "login" | "register") => void;
};

// Вкладка «Главная»: hero с фото → манифест → ритуал (скроллтеллинг) → цифры →
// фотоколлаж → финал с кнопкой в блокнот
export default function HomeView({ start, user, onNavigate, onOpenAuth }: Props) {
  return (
    <>
      <Hero
        start={start}
        user={user}
        onNotebook={() => onNavigate("notebook")}
        onFeatures={() => onNavigate("features")}
      />
      <Manifest />
      <Ritual />
      <Numbers />
      <Moments />
      <Finale
        user={user}
        onNotebook={() => onNavigate("notebook")}
        onRegister={() => onOpenAuth("register")}
      />
    </>
  );
}
