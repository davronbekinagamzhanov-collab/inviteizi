// Generate reviewed, narrowly scoped SQL files. This script NEVER connects to any database.
import './ts-hooks.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const {getDesign,PRICES,catalogPosition}=await import('../templates/registry.ts');
const ids=['sunnat-muqova','sunnat-nasab','sahar-ipagi','sahar-maktubi','umr-sahifalari','ehtirom-kartasi'];
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
const rows=ids.map(id=>{const d=getDesign(id);if(!d)throw Error('Missing release identity');return [quote(d.id),d.number,quote(d.occasion),quote(d.format),d.withPhoto,PRICES[d.format],quote(d.cover),true,catalogPosition(d)].join(', ')});
const values=rows.map(r=>'('+r+')').join(',\n    ');
const columns='id, number, occasion, format, with_photo, price, cover_url, is_active, sort';
const catalog=`-- PRE-DEPLOY: six new catalog identities only. No UPDATE/DELETE, no order reads or writes.
-- Current Git history reserves 107..112; this guard is mandatory because Production was not inspected.
begin;
set local lock_timeout = '5s';
lock table public.templates in share row exclusive mode;
do $$ begin
  if exists (
    with proposed(${columns}) as (values ${values})
    select 1 from public.templates t join proposed p on t.id = p.id or t.number = p.number
    where t.id <> p.id or t.number <> p.number or t.occasion <> p.occasion or t.format <> p.format or t.price <> p.price
  ) then raise exception 'Premium catalog identity/number conflict: transaction aborted; review reservations before release'; end if;
end $$;
insert into public.templates(${columns}) values
    ${values}
on conflict(id) do nothing;
commit;
`;
const tracks=JSON.parse(readFileSync('music/originals/manifest.json','utf8'));
const musicValues=tracks.map((t,i)=>`(${[quote(t.id),quote(t.titleUz),quote(t.titleRu),quote('https://inviteizi.vercel.app/audio/originals/'+t.id+'.mp3'),100+i,true,quote(t.occasion),false,false].join(', ')})`).join(',\n    ');
const music=`-- POST-DEPLOY ONLY: verify all twelve /audio/originals/*.mp3 URLs are live BEFORE executing.
-- Add-only. Existing active tracks, missing local files and user uploads are never hidden or changed.
begin;
set local lock_timeout = '5s';
lock table public.music in share row exclusive mode;
do $$ begin
  if exists (
    with proposed(id, title_uz, title_ru, file_url, sort, is_active, occasion, is_artist, is_generated) as (values ${musicValues})
    select 1 from public.music m join proposed p on m.id = p.id
    where m.file_url <> p.file_url or m.occasion is distinct from p.occasion
  ) then raise exception 'Original music ID conflict: transaction aborted; no existing records overwritten'; end if;
end $$;
insert into public.music(id, title_uz, title_ru, file_url, sort, is_active, occasion, is_artist, is_generated) values
    ${musicValues}
on conflict(id) do nothing;
commit;
`;
mkdirSync('supabase/release',{recursive:true});
writeFileSync('supabase/release/premium-six-templates.sql',catalog);
writeFileSync('supabase/release/original-music-after-deploy.sql',music);
console.log('Prepared six-template pre-deploy SQL and twelve-track post-deploy SQL. Nothing executed.');
