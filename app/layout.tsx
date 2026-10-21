import type { Metadata, Viewport } from "next";
import { t } from "@/texts/uz-cyrl";
import "./globals.css";

// Шрифты подключает каждый дизайн сам (templates/themes/<id>/fonts.ts):
// гость скачивает только шрифты своего пригласительного.

export const metadata: Metadata = {
  title: t.site.title,
  description: t.site.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uz-Cyrl" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
