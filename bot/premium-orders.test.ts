import {useHistoricalCatalog} from './testing/historical';
import {describe,it,expect} from 'vitest';
import {Sim,ADMIN} from './testing/sim';
import {nikohOrder,nikohToReview,startUz} from './testing/paths';
import {uz} from '@/texts/bot-uz';
import {designsFor} from './flow/util';
import {activeDesigns,PRICES,DISPLAY_PRIORITY,getDesign} from '@/templates/registry';
import {usesLegacyDesign} from '@/templates/order-design';
import {invitationData,pageMode} from '@/lib/orders';
const revised=['kabutar-salom','yelpigich-ziynat','samarqand-kitob','qosh-uzuk','saodat-kaliti','ipak-romol','rishton-koshin','marvarid-satr','dutor-navosi','kumush-taroq'];
describe('pinned premium order revision',()=>{
 useHistoricalCatalog();
 for(const [i,id] of revised.entries())it(`${id}: new order survives edit, payment and page data`,async()=>{
  const s=new Sim(),user=950000+i,d=getDesign(id)!;
  await nikohToReview(s,user,undefined,d.format);
  const u=(await s.user(user))!;await s.repo.saveStep(user,'review',{...u.state,templateId:id});
  await s.click(user,uz.review.confirm);const [o]=await s.repo.listOrdersByUser(user);
  expect(o.data.designVersion).toBe('premium-v1');expect(usesLegacyDesign(id,o.data.designVersion)).toBe(false);
  await s.callback(user,`edit:${o.number}`,1);await s.click(user,uz.review.editNames);await s.text(user,'Давронбек');await s.text(user,'Нозима');await s.click(user,uz.review.confirm);
  expect((await s.repo.getOrder(o.id))?.data.designVersion).toBe('premium-v1');
  await s.callback(user,`pay:${o.number}`,1);await s.photo(user,'fixture-receipt');await s.callback(ADMIN,`ok:${o.number}`,1);
  const paid=(await s.repo.getOrderBySlug(o.slug))!;expect(paid.status).toBe('active');expect(paid.amount).toBe(PRICES[d.format]);expect(invitationData(paid).designVersion).toBe('premium-v1');expect(pageMode(paid,s.clock)).toBe('full');
  await s.callback(user,`edit:${o.number}`,1);expect(s.lastText(user)).toBe(uz.order.closed);expect((await s.repo.getOrder(o.id))?.data).toEqual(paid.data);
 });
 it('keeps every historical revised ID legacy through unpaid edits and payment',async()=>{
  const s=new Sim();await startUz(s,960001);
  for(const id of revised){const d=getDesign(id)!;const o=await s.repo.createOrder({userId:960001,occasion:'nikoh',format:d.format,templateId:id,data:{...d.sample},music:{kind:'none'},amount:4321,slugBase:'historical-'+id,status:'preview'});
   await s.callback(960001,`edit:${o.number}`,1);await s.click(960001,uz.review.editNames);await s.text(960001,'Эски исм');await s.text(960001,'Нозима');await s.click(960001,uz.review.confirm);
   const edited=(await s.repo.getOrder(o.id))!;expect(edited.data.designVersion).toBeUndefined();expect(usesLegacyDesign(id,edited.data.designVersion)).toBe(true);expect(edited.amount).toBe(4321);expect(edited.slug).toBe(o.slug);
   await s.callback(960001,`pay:${o.number}`,1);await s.photo(960001,'old-receipt');await s.callback(ADMIN,`ok:${o.number}`,1);expect((await s.repo.getOrder(o.id))?.data.designVersion).toBeUndefined();
  }
 });
 it('pins the release epoch for other new orders too, without changing their loader',async()=>{const s=new Sim(),o=await nikohOrder(s,960002);expect(o.data.designVersion).toBe('premium-v1')});
 it('normal data updates cannot forge or erase a pinned revision',async()=>{const s=new Sim(),o=await nikohOrder(s,960003);const noVersion={...o.data};delete noVersion.designVersion;await s.repo.updateOrder(o.id,{data:noVersion});expect((await s.repo.getOrder(o.id))?.data.designVersion).toBe('premium-v1')});
});
describe('one display order across web and bot',()=>{
 it('ranks new premiums first inside every category/format without renumbering',()=>{for(const occasion of ['nikoh','sunnat','nahorgi','yubiley'] as const)for(const format of ['simple','scroll','animated'] as const){const list=designsFor(occasion,format);expect(list).toEqual(activeDesigns().filter(d=>d.occasion===occasion&&d.format===format));const priority=list.filter(d=>DISPLAY_PRIORITY.includes(d.id));if(priority.length)expect(DISPLAY_PRIORITY.indexOf(list[0].id)).toBeGreaterThanOrEqual(0)}});
 it('retains all fifty original identities and prices',async()=>{const original=(await import('@/docs/reviews/final/original-catalog.json')).default;for(const old of original.filter(d=>d.is_active)){const d=getDesign(old.id)!;expect(d).toMatchObject({number:old.number,format:old.format,occasion:old.occasion});expect(PRICES[d.format]).toBe(old.price)}});
});

describe('catalog promises the pinned appearance when an older unpaid order is edited',()=>{
 useHistoricalCatalog();
 it('uses original cover/demo for a historical order and current ones for a new order',async()=>{
  const sim=new Sim();await startUz(sim,960100);const d=getDesign('kabutar-salom')!;
  const old=await sim.repo.createOrder({userId:960100,occasion:'nikoh',format:'animated',templateId:d.id,data:{...d.sample},music:{kind:'none'},amount:4321,slugBase:'old-presentation',status:'preview'});
  await sim.callback(960100,`edit:${old.number}`,1);await sim.click(960100,uz.review.editDesign);
  expect(sim.last(960100).media).toContain('/covers/legacy/kabutar-salom.jpg');
  expect(JSON.stringify(sim.last(960100).markup)).toContain('/demo/kabutar-salom/legacy');
  const fresh=await nikohOrder(sim,960101);await sim.callback(960101,`edit:${fresh.number}`,1);await sim.click(960101,uz.review.editDesign);
  expect(sim.last(960101).media).not.toContain('/covers/legacy/');
  expect(JSON.stringify(sim.last(960101).markup)).not.toContain('/legacy');
 });
});
