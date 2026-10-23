"use client";

import type { TemplateProps } from "../types";
import { designVars } from "../types";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";

// ЗАГЛУШКА: дизайн в работе. Дизайнер заменяет этот файл целиком.
const vars = designVars({
  primary: "#3B2A1E",
  primaryDark: "#2A1D14",
  gold: "#B8892F",
  goldLight: "#F3D58A",
  paper: "#F8F3EA",
  ink: "#3B2A1E",
  muted: "#7D6A58",
});

export default function Design({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode, { opening: false });
  return (
    <InvitationShell inv={inv} style={vars} className="bg-paper text-ink">
      <main className="flex min-h-svh items-center justify-center p-6 text-center font-display text-3xl">
        {inv.text.greeting}
      </main>
    </InvitationShell>
  );
}
