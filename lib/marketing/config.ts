/** Server flags. No financial feature can be enabled by URL, client state or NEXT_PUBLIC variables. */
export function marketingFlags(source: Record<string, string | undefined> = process.env) {
  const on = (key: string) => source[key]?.toLowerCase() === "true";
  const finance = on("MARKETING_AUTOMATION_ENABLED");
  return {
    ui: on("MARKETING_UI_ENABLED") || source.VERCEL_ENV === "preview",
    referrals: finance && on("MARKETING_REFERRALS_ENABLED"),
    promos: finance && on("MARKETING_PROMOS_ENABLED"),
    status: finance && on("MARKETING_STATUS_ENABLED"),
    edits: finance && on("MARKETING_EDITS_ENABLED"),
    delivery: finance,
  };
}
export function referralReward(source: Record<string, string | undefined> = process.env) {
  const n = Number(source.REFERRAL_REWARD_KZT ?? 1000);
  if (!Number.isSafeInteger(n) || n < 0 || n > 1000000) throw new Error("Invalid REFERRAL_REWARD_KZT");
  return n;
}
export function whatsappUrl(raw?: string) {
  if (!raw) return null;
  const phone = raw.trim().replace(/[ +()-]/g, "");
  return /^[1-9]\d{9,14}$/.test(phone) ? `https://wa.me/${phone}` : null;
}
export { validPublicSource, INVITATION_CODE, PARTNER_CODE } from "./source";
