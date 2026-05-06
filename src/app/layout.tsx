import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ConstellationBackground } from "@/components/ConstellationBackground";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI HQ — Операционный центр CEO",
  description: "Единая панель управления бизнесами. AI-команда, проекты, задачи.",
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
    <html lang="ru" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Prevent theme flash on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light');}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen">
        {/* Aurora glow layer (CSS-only, z-index: -2) */}
        <div className="aurora-layer" aria-hidden="true"><span /></div>
        {/* Constellation canvas (z-index: -1) */}
        <ConstellationBackground />
        <Toaster position="top-right" theme="system" richColors />
        {children}
      </body>
    </html>
  );
}
