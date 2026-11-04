import type { Metadata } from "next";
import { t } from "@/texts/uz-cyrl";
import Expired from "./[slug]/Expired";

export const metadata: Metadata = { title: t.invitationPage.notFound.title, robots: { index: false } };

/** Неверная ссылка: страница по-узбекски в стиле заглушки, а не английская 404 Next.js */
export default function NotFound() {
  return <Expired texts={t.invitationPage.notFound} />;
}
