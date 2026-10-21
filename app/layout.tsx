import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Great_Vibes, Montserrat } from "next/font/google";
import { t } from "@/texts/uz-cyrl";
import "./globals.css";

// Все шрифты с набором cyrillic-ext: в нём есть ў қ ғ ҳ
const script = Great_Vibes({
  variable: "--font-script",
  weight: "400",
  subsets: ["cyrillic", "cyrillic-ext", "latin"],
});

const serif = Cormorant_Garamond({
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["cyrillic", "cyrillic-ext", "latin"],
});

const sans = Montserrat({
  variable: "--font-sans",
  subsets: ["cyrillic", "cyrillic-ext", "latin"],
});

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
    <html
      lang="uz-Cyrl"
      className={`${script.variable} ${serif.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
