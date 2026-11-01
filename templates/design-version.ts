import type {InvitationData} from '@/lib/types';
export const CURRENT_DESIGN_VERSION = 'premium-v1' as const;
export const REVISED_DESIGNS = ['kabutar-salom','yelpigich-ziynat','samarqand-kitob','qosh-uzuk','saodat-kaliti','ipak-romol','rishton-koshin','marvarid-satr','dutor-navosi','kumush-taroq'] as const;
const revised = new Set<string>(REVISED_DESIGNS);
/** One persisted version signal for order rendering, catalog presentation and link artwork. */
export function usesLegacyDesign(id:string, version?:InvitationData['designVersion']) {
  return version !== CURRENT_DESIGN_VERSION && revised.has(id);
}
