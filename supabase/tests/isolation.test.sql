begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(26);

insert into auth.users(id,email,raw_user_meta_data) values
 ('a0000000-0000-4000-8000-000000000001','owner-a@example.test','{"name":"Owner A","platform_role":"SUPER_ADMIN"}'),
 ('a0000000-0000-4000-8000-000000000002','owner-b@example.test','{}'),
 ('a0000000-0000-4000-8000-000000000003','employee@example.test','{}'),
 ('a0000000-0000-4000-8000-000000000004','admin@example.test','{}');
update public.profiles set platform_role='SUPER_ADMIN' where id='a0000000-0000-4000-8000-000000000004';
insert into public.restaurants(id,name,slug,email) values('b0000000-0000-4000-8000-000000000001','Restaurante B','restaurante-b','b@example.test');
insert into public.subscriptions(restaurant_id,plan_id,status,current_period_end)
 values('b0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','active',now()+interval '30 days');
insert into public.memberships(restaurant_id,user_id,role) values
 ('20000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','RESTAURANT_OWNER'),
 ('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002','RESTAURANT_OWNER'),
 ('20000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003','RESTAURANT_EMPLOYEE');
insert into public.categories(id,restaurant_id,name) values('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','Categoria B');
insert into public.products(restaurant_id,name,price) values('b0000000-0000-4000-8000-000000000001','Produto B',10);

set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
select is((select platform_role from public.profiles where id=auth.uid()),'USER','Metadados de cadastro não elevam privilégio');
select is((select count(*) from public.restaurants),1::bigint,'Owner vê somente seu restaurante');
select is((select count(*) from public.products where restaurant_id='b0000000-0000-4000-8000-000000000001'),0::bigint,'Produtos B invisíveis ao owner A');
select throws_ok($$insert into public.products(restaurant_id,name,price) values('b0000000-0000-4000-8000-000000000001','Invasão',1)$$,'42501',null,'INSERT em outro tenant é bloqueado');
select throws_ok($$insert into public.products(restaurant_id,category_id,name,price) values('20000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','Categoria cruzada',1)$$,'23503',null,'Categoria cruzada é bloqueada pela FK composta');
with changed as (update public.products set price=0 where restaurant_id='b0000000-0000-4000-8000-000000000001' returning id)
 select is(count(*),0::bigint,'UPDATE em B não alcança registros') from changed;
with changed as (delete from public.products where restaurant_id='b0000000-0000-4000-8000-000000000001' returning id)
 select is(count(*),0::bigint,'DELETE em B não alcança registros') from changed;
select throws_ok($$update public.profiles set platform_role='SUPER_ADMIN' where id=auth.uid()$$,'42501',null,'Usuário não eleva seu perfil');
select throws_ok($$select public.create_restaurant('{"name":"X"}','10000000-0000-4000-8000-000000000001')$$,'42501',null,'Owner não cadastra restaurante global');
select throws_ok($$select public.manage_member('b0000000-0000-4000-8000-000000000001',auth.uid(),'RESTAURANT_OWNER')$$,'42501',null,'Owner não cria vínculo em outro tenant');
select throws_ok($$select public.manage_member('20000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003','RESTAURANT_OWNER')$$,'42501',null,'Owner não promove proprietário');
select throws_ok($$update public.products set restaurant_id='b0000000-0000-4000-8000-000000000001' where restaurant_id='20000000-0000-4000-8000-000000000001'$$,'42501',null,'Tenant de produto é imutável');
select throws_ok($$insert into public.audit_logs(action,entity) values('FAKE','fake')$$,'42501',null,'Auditoria não pode ser forjada');
select throws_ok($$select * from private.integration_credentials$$,'42501',null,'Credenciais são inacessíveis ao navegador');
select throws_ok($$select public.connect_integration('b0000000-0000-4000-8000-000000000001','ifood')$$,'42501',null,'Conexão em outro tenant é bloqueada');
select is((select count(*) from public.audit_logs where restaurant_id='b0000000-0000-4000-8000-000000000001'),0::bigint,'Auditoria de B é invisível a A');
select lives_ok($$select public.connect_integration('20000000-0000-4000-8000-000000000001','ifood')$$,'Owner conecta simulação no próprio tenant');
select lives_ok($$select public.publish_menu('20000000-0000-4000-8000-000000000001','ifood','d0000000-0000-4000-8000-000000000001')$$,'Publicação simulada do owner funciona');
select lives_ok($$select public.publish_menu('20000000-0000-4000-8000-000000000001','ifood','d0000000-0000-4000-8000-000000000001')$$,'Repetição idempotente não duplica publicação');
select is((select count(*) from public.publications where request_id='d0000000-0000-4000-8000-000000000001'),1::bigint,'Uma publicação por chave de idempotência');

select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000003',true);
select ok((select count(*)>0 from public.products),'Funcionário pode ler o cardápio');
select throws_ok($$insert into public.products(restaurant_id,name,price) values('20000000-0000-4000-8000-000000000001','Sem permissão',1)$$,'42501',null,'Funcionário não cria produtos');
select throws_ok($$select public.publish_menu('20000000-0000-4000-8000-000000000001','ifood',gen_random_uuid())$$,'42501',null,'Funcionário não publica');

reset role;
update public.restaurants set status='suspended' where id='20000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
select is((select count(*) from public.products),0::bigint,'Suspensão bloqueia acesso aos produtos');
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000004',true);
select ok((select count(*)>=2 from public.restaurants),'SUPER_ADMIN vê inclusive restaurantes suspensos');
set local role anon;
select throws_ok($$select * from public.restaurants$$,'42501',null,'Anônimo não lê restaurantes');
reset role;
select * from finish();
rollback;
