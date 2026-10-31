/**
 * Служебная страница /dev/invitation: открыта в разработке и при локальной проверке сборки (INVITEIZI_CHECK=1).
 * На Vercel закрыта всегда, в любом окружении и при любом значении INVITEIZI_CHECK.
 */
export function checkPagesAllowed(env: Record<string, string | undefined> = process.env) {
  if (env.VERCEL || env.VERCEL_ENV) return false;
  return env.NODE_ENV !== "production" || env.INVITEIZI_CHECK === "1";
}
