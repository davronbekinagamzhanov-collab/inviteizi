"use client";
/**
 * Живое превью: родитель (/app) присылает {templateId, data} через postMessage, дизайн перерисовывается без перезагрузки.
 * Принимаем сообщения только от своего сайта.
 */
import { useEffect, useState, type ComponentType } from "react";
import { getDesign, type TemplateProps } from "@/templates/registry";
import type { InvitationData } from "@/lib/types";
import { glueData } from "@/lib/typography";
import { loadDesign } from "@/templates/design-modules";
import { ONE_PAGE_LOOKS } from "@/templates/one-page-looks";
import { OnePage } from "@/templates/blocks/OnePage";

type Msg = { type: "inviteizi:preview"; templateId: string; data: InvitationData };

export default function LivePreview() {
  const [msg, setMsg] = useState<Msg | null>(null);
  const [loaded, setLoaded] = useState<{ id: string; Design: ComponentType<TemplateProps> } | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const m = e.data as Msg;
      if (m?.type === "inviteizi:preview" && typeof m.templateId === "string") setMsg(m);
    };
    window.addEventListener("message", onMessage);
    window.parent?.postMessage({ type: "inviteizi:preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const id = msg?.templateId;
    if (!id || loaded?.id === id) return;
    const design = getDesign(id);
    if (!design) return;
    let alive = true;
    loadDesign(design).then((m) => alive && setLoaded({ id, Design: m.default }));
    return () => {
      alive = false;
    };
  }, [msg?.templateId, loaded?.id]);

  if (!msg || !loaded || loaded.id !== msg.templateId) {
    return <main className="min-h-svh bg-[#f7efe3]" />;
  }
  const { Design } = loaded;
  // Маленькое превью (?mini=1) — без музыки: его не нажать, кнопка музыки там лишняя
  const mini = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("mini");
  const data = glueData(mini ? { ...msg.data, noMusic: true } : msg.data);
  // «Оддий» — тот же одноэкранный макет, что на странице приглашения (раньше превью показывало старый вид)
  if (ONE_PAGE_LOOKS[loaded.id]) return <OnePage id={loaded.id} data={data} mode="full" />;
  return <Design data={data} mode="full" />;
}
