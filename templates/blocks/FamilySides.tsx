import { t } from "@/texts/uz-cyrl";
import type { Invitation } from "./useInvitation";
import s from "./family-sides.module.css";

/**
 * Семьи жениха и невесты (никоҳ) для дизайнов, у которых нет своего блока сторон.
 * Цвет и шрифт наследуются от дизайна: подпись — тише, имя семьи — как текст вокруг.
 * Показывается только заполненная сторона; без сторон блока нет.
 */
export function FamilySides({ inv, className = "" }: { inv: Invitation; className?: string }) {
  const sides = inv.occasion === "nikoh" ? inv.sides : undefined;
  if (!sides) return null;
  const rows = [
    { label: t.sides.groom, name: sides.groom },
    { label: t.sides.bride, name: sides.bride },
  ].filter((r) => r.name?.trim());
  if (!rows.length) return null;
  return (
    <div data-family-sides className={`${s.sides} ${rows.length === 1 ? s.single : ""} ${className}`}>
      {rows.map((r) => (
        <div key={r.label} className={s.side}>
          <span className={s.label}>{r.label}</span>
          <span className={s.name}>{r.name}</span>
        </div>
      ))}
    </div>
  );
}
