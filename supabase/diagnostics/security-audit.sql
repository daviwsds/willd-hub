-- Consulta somente de leitura para o SQL Editor do projeto publicado.
-- Não contém fixtures, criação de usuários ou alterações de dados/permissões.
-- Execute o arquivo inteiro. Todos os itens devem retornar OK.
-- Isto verifica a configuração instalada; não substitui os testes de comportamento pgTAP.
with expected(schema_name,table_name) as (
 values
 ('public','profiles'),('public','restaurants'),('public','memberships'),
 ('public','plans'),('public','subscriptions'),('public','payments'),
 ('public','categories'),('public','products'),('public','extras'),
 ('public','product_extras'),('public','hours'),('public','integrations'),
 ('public','publications'),('public','audit_logs'),('public','error_logs'),
 ('private','integration_credentials')
), tables as (
 select e.*,c.oid,c.relrowsecurity
 from expected e
 left join pg_namespace n on n.nspname=e.schema_name
 left join pg_class c on c.relnamespace=n.oid and c.relname=e.table_name and c.relkind='r'
), functions as (
 select p.oid,p.proname,p.prosecdef,p.proconfig
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in (
 'is_super_admin','has_restaurant_access','update_restaurant','manage_member',
 'connect_integration','disconnect_integration','publish_menu','create_restaurant','record_integration_error'
 )
), checks as (
 select 'RLS: '||schema_name||'.'||table_name as verificacao,
 case when oid is null then 'FALTA TABELA' when relrowsecurity then 'OK' else 'REVISAR: RLS DESATIVADA' end as resultado
 from tables
 union all
 select 'Acesso anônimo: '||schema_name||'.'||table_name,
 case when oid is null then 'FALTA TABELA'
 when has_table_privilege('anon',oid,'SELECT,INSERT,UPDATE,DELETE') then 'REVISAR: HÁ PRIVILÉGIOS' else 'OK' end
 from tables
 union all
 select 'Schema privado para authenticated',case when to_regnamespace('private') is null then 'FALTA SCHEMA' when has_schema_privilege('authenticated',to_regnamespace('private'),'USAGE') then 'REVISAR: SCHEMA ACESSÍVEL' else 'OK' end
 union all
 select 'Schema privado para anon',case when to_regnamespace('private') is null then 'FALTA SCHEMA' when has_schema_privilege('anon',to_regnamespace('private'),'USAGE') then 'REVISAR: SCHEMA ACESSÍVEL' else 'OK' end
 union all
 select 'Função protegida: '||proname,
 case when not prosecdef then 'REVISAR: FUNÇÃO NÃO PRIVILEGIADA'
 when has_function_privilege('anon',oid,'EXECUTE') then 'REVISAR: EXECUÇÃO ANÔNIMA'
 when not exists(select 1 from unnest(proconfig) cfg where cfg in ('search_path=""','search_path=')) then 'REVISAR: SEARCH_PATH'
 else 'OK' end
 from functions
 union all
 select 'Quantidade de funções de acesso',case when count(*)=9 then 'OK' else 'REVISAR: FUNÇÕES AUSENTES OU SOBRECARGAS' end from functions
 union all
 select 'Imutabilidade do tenant: '||t.schema_name||'.'||t.table_name,
 case when exists (
 select 1 from pg_trigger g where g.tgrelid=t.oid and g.tgname='immutable_tenant' and g.tgenabled in ('O','A') and not g.tgisinternal
 ) then 'OK' else 'REVISAR: TRIGGER AUSENTE' end
 from tables t where table_name in ('memberships','categories','products','extras','product_extras','hours','subscriptions','payments','integrations','publications') and schema_name='public'
)
select verificacao,resultado from checks order by (resultado <> 'OK') desc,verificacao;
