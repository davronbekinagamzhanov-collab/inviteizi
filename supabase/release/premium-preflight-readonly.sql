-- Owner-run metadata-only preflight. No customer names, contacts, addresses, receipts or order IDs.
begin transaction read only;
set local statement_timeout = '5s';
select table_name, column_name, data_type
from information_schema.columns
where table_schema='public' and (
  (table_name='orders' and column_name in ('design_version','format','rsvp')) or
  (table_name='music' and column_name in ('occasion','is_generated','is_artist')))
order by table_name,column_name;
select id,number,occasion,format,is_active
from public.templates
where number between 107 and 112 or id in
 ('sunnat-muqova','sunnat-nasab','sahar-ipagi','sahar-maktubi','umr-sahifalari','ehtirom-kartasi')
order by number;
select occasion,format,count(*) as active_templates
from public.templates where is_active group by occasion,format order by occasion,format;
select occasion,count(*) as active_music
from public.music where is_active group by occasion order by occasion;
select template_id,status,count(*) as saved_orders
from public.orders where template_id in
 ('kabutar-salom','yelpigich-ziynat','samarqand-kitob','qosh-uzuk','saodat-kaliti',
  'ipak-romol','rishton-koshin','marvarid-satr','dutor-navosi','kumush-taroq')
group by template_id,status order by template_id,status;
commit;
