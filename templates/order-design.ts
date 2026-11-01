import type { Design } from './registry';
import type { InvitationData } from '@/lib/types';
import { REVISED_DESIGNS, usesLegacyDesign } from './design-version';
export { usesLegacyDesign } from './design-version';
const legacy = {
  'ipak-romol': () => import('./themes/ipak-romol/Legacy'),
  'rishton-koshin': () => import('./themes/rishton-koshin/Legacy'),
  'marvarid-satr': () => import('./themes/marvarid-satr/Legacy'),
  'dutor-navosi': () => import('./themes/dutor-navosi/Legacy'),
  'kumush-taroq': () => import('./themes/kumush-taroq/Legacy'),

  'kabutar-salom': () => import('./themes/kabutar-salom/Legacy'),
  'yelpigich-ziynat': () => import('./themes/yelpigich-ziynat/Legacy'),
  'samarqand-kitob': () => import('./themes/samarqand-kitob/Legacy'),
  'qosh-uzuk': () => import('./themes/qosh-uzuk/Legacy'),
  'saodat-kaliti': () => import('./themes/saodat-kaliti/Legacy'),
} satisfies Record<(typeof REVISED_DESIGNS)[number], unknown>;
export function loadOrderDesign(design: Design, version?: InvitationData['designVersion']) {
  if (usesLegacyDesign(design.id, version)) return legacy[design.id as keyof typeof legacy]();
  return design.load();
}
