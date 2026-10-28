insert into public.plans(id,name,monthly_price,product_limit,publication_limit,integration_limit,features) values
 ('10000000-0000-4000-8000-000000000001','Essencial',49.90,50,30,1,'["50 produtos","1 integração","30 publicações por mês"]'),
 ('10000000-0000-4000-8000-000000000002','Profissional',99.90,300,150,2,'["300 produtos","2 integrações","150 publicações por mês"]'),
 ('10000000-0000-4000-8000-000000000003','Escala',199.90,1500,500,2,'["1.500 produtos","2 integrações","500 publicações por mês"]');
insert into public.restaurants(id,name,slug,email,phone,address) values
 ('20000000-0000-4000-8000-000000000001','WillD Açaíteria','willd-acaiteria','contato@willd.example','(11) 99999-0000','São Paulo, SP');
insert into public.subscriptions(restaurant_id,plan_id,status,trial_ends_at,current_period_end) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','trialing',now()+interval '14 days',now()+interval '14 days');
insert into public.categories(id,restaurant_id,name,description,sort_order) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Açaís','Seu açaí do seu jeito',1),
 ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Combos','Combinações para compartilhar',2),
 ('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','Bebidas','Para refrescar',3);
insert into public.products(restaurant_id,category_id,name,description,price,emoji) values
 ('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Açaí tradicional 300ml','Açaí cremoso com banana e granola.',16.90,'🍇'),
 ('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Açaí especial 500ml','Açaí, morango, leite em pó e leite condensado.',24.90,'🍓'),
 ('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Açaí premium 700ml','Muito açaí com creme de avelã e frutas.',32.90,'🍫'),
 ('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','Combo do casal','Dois açaís de 500ml com três complementos.',44.90,'💜'),
 ('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','Combo da galera','Quatro açaís tradicionais de 300ml.',59.90,'🍇'),
 ('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','Suco de laranja 400ml','Natural, feito na hora.',9.90,'🍊');
insert into public.extras(restaurant_id,name,price) values
 ('20000000-0000-4000-8000-000000000001','Leite em pó',3.00),
 ('20000000-0000-4000-8000-000000000001','Creme de avelã',5.00),
 ('20000000-0000-4000-8000-000000000001','Morango',4.00),
 ('20000000-0000-4000-8000-000000000001','Granola',2.00);
insert into public.hours(restaurant_id,weekday,opens_at,closes_at,closed)
 select '20000000-0000-4000-8000-000000000001',day,'12:00'::time,'23:00'::time,false from generate_series(0,6) day;
-- Seed não cria usuários, senhas ou credenciais. Vincular o primeiro proprietário pelo procedimento documentado.
