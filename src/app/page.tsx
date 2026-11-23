import AppShell from "@/components/site/AppShell";

// MINDLY — весь продукт живёт на единственном маршруте «/»:
// вкладки сайта (Главная / Возможности / Блокнот) переключаются на клиенте
export default function Page() {
  return <AppShell />;
}
