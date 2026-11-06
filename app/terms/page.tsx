import type { Metadata } from "next";
import { TermsView } from "./TermsView";

export const metadata: Metadata = { title: "Шартлар · InviteIZI" };

export default function TermsUz() {
  return <TermsView lang="uz" />;
}
