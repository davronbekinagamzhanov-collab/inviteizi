"use client";

import type { TemplateProps } from "../types";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { designVars } from "../types";

/** ЗАГЛУШКА — дизайн ещё не сделан */
export default function Sapfir({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode, { opening: false });
  return (
    <InvitationShell
      inv={inv}
      style={designVars({ primary: "#3b2a1e", primaryDark: "#2a1d14", gold: "#b8892f", goldLight: "#f3d58a", paper: "#f8f3ea", ink: "#3b2a1e", muted: "#7d6a58" })}
    >
      <p className="p-8">{inv.text.body}</p>
    </InvitationShell>
  );
}
