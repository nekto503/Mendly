"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Провайдер темы: класс .dark на <html>, сохранение выбора в localStorage.
// Системную тему не навязываем — по умолчанию сайт светлый, тёмная включается вручную.
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
