import {describe,it,expect} from 'vitest';
import tracks from '@/music/originals/manifest.json';
import {Sim} from './testing/sim';import {startUz} from './testing/paths';import {uz} from '@/texts/bot-uz';import {getDesign} from '@/templates/registry';import {invitationData} from '@/lib/orders';
describe('all twelve original choices through the existing music flow',()=>{
 for(const [index,t] of tracks.entries())it(`${t.id}: preview, choose, persist exact music ID and public URL`,async()=>{
  const music=tracks.map((row,i)=>({id:row.id,titleUz:row.titleUz,titleRu:row.titleRu,fileUrl:'https://fixture.invalid/audio/originals/'+row.id+'.mp3',sort:i,occasion:row.occasion as 'sunnat'|'yubiley',telegramFileId:null}));
  const sim=new Sim({music}),user=980000+index,design=getDesign(t.occasion==='sunnat'?'sunnat-muqova':'umr-sahifalari')!;
  await startUz(sim,user);await sim.repo.saveStep(user,'music',{q:700,occasion:design.occasion,format:design.format,templateId:design.id,data:{...design.sample,rsvp:false}});
  await sim.callback(user,'a:700:list',1);
  for(const row of tracks.filter(row=>row.occasion===t.occasion))expect(sim.lastText(user)+JSON.stringify(sim.last(user).markup)).toContain(row.titleUz);
  const state=(await sim.user(user))!;await sim.callback(user,`a:${state.state.q}:p:${t.id}`,1);
  expect(sim.tg.to(user).some(m=>m.type==='audio'&&m.media===music[index].fileUrl)).toBe(true);
  const previewed=(await sim.user(user))!;expect((previewed.state.music as {musicId?:string}|undefined)?.musicId).toBeUndefined();
  await sim.callback(user,`a:${previewed.state.q}:s:${t.id}`,1);await sim.click(user,uz.review.confirm);
  const [o]=await sim.repo.listOrdersByUser(user);expect(o.music).toEqual({kind:'list',musicId:t.id});expect(invitationData(o,music[index].fileUrl).musicUrl).toBe(music[index].fileUrl);
 });
});
