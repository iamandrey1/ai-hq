import type { Metadata } from "next";
import { Fraunces, Manrope, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI HQ — Операционный центр CEO",
  description: "Единая панель управления бизнесами Jo и Андрея. AI-команда, проекты, задачи.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${fraunces.variable} ${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen relative z-10">
        <Toaster position="top-right" theme="dark" richColors />
        {children}
      </body>
    </html>
  );
}
