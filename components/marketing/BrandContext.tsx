"use client";
import { createContext, useContext, type ReactNode } from "react";
import { botLink } from "@/lib/brand";
import { getInviteLang } from "@/texts/invite-lang";
import { validPublicSource } from "@/lib/marketing/source";
const Context = createContext<{
  enabled: boolean;
  source?: string | null;
}>({ enabled: false });
export function MarketingBrandProvider({
  enabled,
  source,
  children,
}: {
  enabled: boolean;
  source?: string | null;
  children: ReactNode;
}) {
  return <Context.Provider value={{ enabled, source: validPublicSource(source) }}>{children}</Context.Provider>;
}
export function useBrandDestination(kind: "badge" | "footer") {
  const c = useContext(Context),
    lang = getInviteLang() === "ru" ? "ru" : "uz";
  return {
    enabled: c.enabled,
    href: c.enabled
      ? `/catalog/invite?lang=${lang}${c.source ? "&ref=" + encodeURIComponent(c.source) : ""}`
      : botLink(kind),
  };
}
