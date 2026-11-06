/** Пустая анкета тадбира — отдельно от экрана анкеты, чтобы первый экран приложения её не тянул */
import type { EventKind, Occasion } from "@/lib/types";
import { MAIN_EVENT, RELATIONS, type FormInput } from "@/lib/order-rules";

export const DEFAULT_TIME: Record<EventKind, string> = {
  nikohBazm: "18:00",
  nahorgi: "06:00",
  sunnatBazm: "18:00",
  yubileyBazm: "18:00",
  kelinSalom: "09:00",
  nikohMarosim: "14:00",
};

export function emptyForm(occasion: Occasion): FormInput {
  const kind = MAIN_EVENT[occasion];
  return { occasion, relation: RELATIONS[occasion][0], events: [{ kind, time: DEFAULT_TIME[kind] }] } as FormInput;
}
