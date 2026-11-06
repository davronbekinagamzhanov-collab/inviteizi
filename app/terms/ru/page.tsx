import type { Metadata } from "next";
import { TermsView } from "../TermsView";

export const metadata: Metadata = { title: "Условия · InviteIZI" };

export default function TermsRu() {
  return <TermsView lang="ru" />;
}
