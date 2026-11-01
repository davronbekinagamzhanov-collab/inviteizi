import {describe,it,expect} from 'vitest';
import {monogram,initial} from './themes/premium/monogram';
import {usesLegacyDesign,loadOrderDesign} from './order-design';
import type {Design} from './registry';
describe('premium monograms',()=>{
 it.each([['Давронбек','Нозима','D & N'],['  💐 Қодир','Ўғилой','Q & O'],['Ғани','Ҳалима','G & H'],['Élodie','John','E & J'],['---','123','♡'],[undefined,'Нозима','N'],['ьЪШоҳ','Чарос','S & C']])('%s + %s',(a,b,want)=>expect(monogram(a,b)).toBe(want));
 it('never manufactures initials from missing data',()=>expect(initial('123 💍')).toBe(''));
});
describe('order appearance preservation',()=>{
 for(const id of ['kabutar-salom','yelpigich-ziynat','samarqand-kitob','qosh-uzuk','saodat-kaliti']){
  it(`${id}: absent version preserves all old orders, regardless of status`,()=>{
   expect(usesLegacyDesign(id)).toBe(true);
   expect(usesLegacyDesign(id,'premium-v1')).toBe(false);
  });
 }
 it('leaves other designs alone',()=>expect(usesLegacyDesign('sapfir')).toBe(false));
 it('loads new design only with explicit opt-in',async()=>{
  const expected={default:()=>null};
  const design={id:'kabutar-salom',load:async()=>expected} as unknown as Design;
  expect(await loadOrderDesign(design,'premium-v1')).toBe(expected);
 });
});
