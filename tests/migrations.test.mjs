import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sql=readFileSync(new URL('../supabase/migrations/202610260001_initial.sql',import.meta.url),'utf8');
// Verificação estrutural complementar. O comportamento RLS é testado em supabase/tests.
test('tabelas de negócio carregam restaurant_id obrigatório',()=>{
 for(const name of ['memberships','subscriptions','payments','categories','products','extras','product_extras','hours','integrations','publications']){
  const body=sql.split(`create table public.${name} (`)[1]?.split('\n);')[0];
  assert.ok(body,`tabela ${name}`);assert.match(body,/restaurant_id uuid not null/,name);
 }
});
test('chaves de relacionamentos impedem categorias de outro tenant',()=>assert.match(sql,/foreign key\(restaurant_id,category_id\) references public.categories\(restaurant_id,id\)/));
test('complementos só se vinculam a produtos do mesmo tenant',()=>{
 assert.match(sql,/foreign key\(restaurant_id,product_id\) references public.products\(restaurant_id,id\)/);
 assert.match(sql,/foreign key\(restaurant_id,extra_id\) references public.extras\(restaurant_id,id\)/);
});
test('credenciais ficam fora do schema público sem grants de leitura',()=>{
 assert.match(sql,/revoke all on schema private from public, anon, authenticated/);
 assert.match(sql,/alter table private.integration_credentials enable row level security/);
 assert.doesNotMatch(sql,/grant select.*private.integration_credentials/i);
});
test('publicações são idempotentes e limites usam bloqueio transacional',()=>{
 assert.match(sql,/unique\(restaurant_id,request_id\)/);
 assert.match(sql,/where id=rid for update/);
 assert.match(sql,/date_trunc\('month',now\(\)\)/);
});
test('privilégios de função são explicitamente revogados de anônimos',()=>assert.match(sql,/revoke execute on all functions in schema public from public,anon/));
