export const INVITATION_CODE = /^inv_([a-f0-9]{32})$/;
export const PARTNER_CODE = /^p_([a-z0-9]{4,32})$/;
export function validPublicSource(raw: unknown): string | null {
  return typeof raw === "string" && raw.length <= 64 && (INVITATION_CODE.test(raw) || PARTNER_CODE.test(raw))
    ? raw
    : null;
}
