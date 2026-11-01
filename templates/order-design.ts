import type { Design } from './registry';
import type { InvitationData } from '@/lib/types';
const legacy = {
  'kabutar-salom': () => import('./themes/kabutar-salom/Legacy'),
  'yelpigich-ziynat': () => import('./themes/yelpigich-ziynat/Legacy'),
  'samarqand-kitob': () => import('./themes/samarqand-kitob/Legacy'),
  'qosh-uzuk': () => import('./themes/qosh-uzuk/Legacy'),
  'saodat-kaliti': () => import('./themes/saodat-kaliti/Legacy'),
};
export function loadOrderDesign(design: Design, version?: InvitationData['designVersion']) {
  if (version !== 'premium-v1' && Object.hasOwn(legacy, design.id)) return legacy[design.id as keyof typeof legacy]();
  return design.load();
}
export function usesLegacyDesign(id: string, version?: InvitationData['designVersion']) {
  return version !== 'premium-v1' && Object.hasOwn(legacy, id);
}
