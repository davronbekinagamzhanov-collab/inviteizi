import {describe,it,expect,vi} from 'vitest';
import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {getDesign,longSample} from './registry';import {loadOrderDesign,usesLegacyDesign} from './order-design';import {mapLink} from '@/lib/map-link';
vi.mock('next/font/local',()=>({default:()=>({variable:'font-fixture'})}));
const ids=['kabutar-salom','yelpigich-ziynat','samarqand-kitob','qosh-uzuk','saodat-kaliti','ipak-romol','rishton-koshin','marvarid-satr','dutor-navosi','kumush-taroq'];
describe('real legacy components, not replacement stubs',()=>{
 for(const id of ids)it(`${id}: an unversioned order keeps its original component and all data`,async()=>{const d=getDesign(id)!,old=await loadOrderDesign(d),fresh=await loadOrderDesign(d,'premium-v1');expect(old.default).not.toBe(fresh.default);expect(usesLegacyDesign(id)).toBe(true);const data={...longSample(d),noMusic:true};const html=renderToStaticMarkup(createElement(old.default,{data,mode:'full',art:d.art})),plain=html.replace(/<[^>]+>/g,'').replace(/\s+/g,' ');for(const value of [data.groom,data.bride,data.hosts,data.sides?.groom,data.sides?.bride].filter(Boolean))expect(plain).toContain(value);for(const e of data.events){expect(plain).toContain(e.venueName);expect(plain).toContain(e.address);expect(html).toContain(mapLink(e))}});
});
