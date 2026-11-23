import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import ThemeProvider from "@/components/site/ThemeProvider";

// Люкс-триада из гайда ui-ux-pro-max: Playfair Display + Inter + JetBrains Mono (все с кириллицей)
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MINDLY — место для твоих мыслей",
  description:
    "Заметки, которые живут в браузере: записывай на телефоне, открывай на компьютере. Markdown, вложения, GitHub-ссылки и экспорт в PDF.",
  keywords: [
    "MINDLY",
    "миндли",
    "заметки",
    "заметки онлайн",
    "блокнот",
    "блокнот в браузере",
    "блокнот онлайн",
    "дневник онлайн",
    "записки",
    "markdown заметки",
    "органайзер мыслей",
    "синхронизация заметок",
    "заметки телефон и компьютер",
    "заметки с папками",
    "избранные заметки",
    "вложения в заметках",
    "экспорт заметок в pdf",
    "граф связей заметок",
    "бесплатный блокнот",
  ],
  applicationName: "MINDLY",
  authors: [{ name: "MINDLY" }],
  robots: { index: true, follow: true },
  openGraph: {
    title: "MINDLY — место для твоих мыслей",
    description:
      "Записывай на телефоне — открывай на компьютере. Всё в браузере, ничего устанавливать не нужно.",
    siteName: "MINDLY",
    type: "website",
    locale: "ru_RU",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#04151C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${playfair.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
