-- WillD Hub: executar como proprietário do banco pelo Supabase CLI.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create type public.restaurant_role as enum ('RESTAURANT_OWNER','RESTAURANT_MANAGER','RESTAURANT_EMPLOYEE');
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default '',
 platform_role text not null default 'USER' check (platform_role in ('USER','SUPER_ADMIN')),
 created_at timestamptz not null default now()
);
create table public.restaurants (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 120),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 email text not null, phone text not null default '', address text not null default '',
 status text not null default 'active' check(status in ('active','suspended')),
 created_at timestamptz not null default now()
);
create table public.memberships (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id),
 user_id uuid not null references public.profiles(id) on delete cascade, role public.restaurant_role not null,
 created_at timestamptz not null default now(), unique(restaurant_id,user_id)
);
create table public.plans (
 id uuid primary key default gen_random_uuid(), name text not null unique, monthly_price numeric(12,2) not null check(monthly_price >= 0),
 product_limit integer not null check(product_limit > 0), publication_limit integer not null check(publication_limit > 0),
 integration_limit integer not null check(integration_limit between 1 and 2), trial_days integer not null default 14 check(trial_days >= 0),
 features jsonb not null default '[]'
);
create table public.subscriptions (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null unique references public.restaurants(id),
 plan_id uuid not null references public.plans(id), status text not null check(status in ('trialing','active','past_due','canceled')),
 trial_ends_at timestamptz, current_period_end timestamptz not null, created_at timestamptz not null default now()
);
create table public.payments (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id),
 amount numeric(12,2) not null check(amount >= 0), status text not null check(status in ('pending','paid','failed','refunded')),
 provider_reference text, created_at timestamptz not null default now()
);
create table public.categories (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id),
 name text not null check(length(name) between 2 and 120), description text not null default '', active boolean not null default true,
 sort_order integer not null default 0 check(sort_order >= 0), created_at timestamptz not null default now(), unique(restaurant_id,id)
);
create table public.products (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id), category_id uuid,
 name text not null check(length(name) between 2 and 120), description text not null default '', price numeric(12,2) not null check(price between 0 and 100000),
 emoji text not null default '🍇', active boolean not null default true, created_at timestamptz not null default now(), unique(restaurant_id,id),
 foreign key(restaurant_id,category_id) references public.categories(restaurant_id,id)
);
create table public.extras (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id),
 name text not null check(length(name) between 2 and 120), price numeric(12,2) not null check(price between 0 and 100000),
 active boolean not null default true, created_at timestamptz not null default now(), unique(restaurant_id,id)
);
create table public.product_extras (
 restaurant_id uuid not null references public.restaurants(id), product_id uuid not null, extra_id uuid not null,
 primary key(restaurant_id,product_id,extra_id),
 foreign key(restaurant_id,product_id) references public.products(restaurant_id,id) on delete cascade,
 foreign key(restaurant_id,extra_id) references public.extras(restaurant_id,id) on delete cascade
);
create table public.hours (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id),
 weekday integer not null check(weekday between 0 and 6), opens_at time not null, closes_at time not null, closed boolean not null default false,
 unique(restaurant_id,weekday), check(closed or opens_at < closes_at)
);
create table public.integrations (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id),
 provider text not null check(provider in ('ifood','99food')), status text not null default 'disconnected' check(status in ('disconnected','simulated','error')),
 mode text not null default 'simulated' check(mode = 'simulated'), updated_at timestamptz not null default now(), unique(restaurant_id,provider)
);
create table private.integration_credentials (
 restaurant_id uuid not null references public.restaurants(id), provider text not null check(provider in ('ifood','99food')),
 ciphertext text not null, updated_at timestamptz not null default now(), primary key(restaurant_id,provider)
);
create table public.publications (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id),
 provider text not null check(provider in ('ifood','99food')), status text not null check(status in ('simulated','failed')),
 product_count integer not null, snapshot jsonb not null default '[]', created_by uuid references auth.users(id),
 request_id uuid not null, created_at timestamptz not null default now(), unique(restaurant_id,request_id)
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid references public.restaurants(id), actor_id uuid references auth.users(id),
 action text not null, entity text not null, entity_id text, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.error_logs (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid references public.restaurants(id),
 source text not null, message text not null, resolved boolean not null default false, created_at timestamptz not null default now()
);
create index on public.memberships(user_id,restaurant_id);
create index on public.publications(restaurant_id,created_at);
create index on public.audit_logs(restaurant_id,created_at);
create index on public.error_logs(restaurant_id,created_at);

create function public.is_super_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id = auth.uid() and platform_role = 'SUPER_ADMIN');
$$;
create function public.has_restaurant_access(rid uuid, ability text default 'read') returns boolean language sql stable security definer set search_path = '' as $$
 select public.is_super_admin() or exists (
 select 1 from public.memberships m join public.restaurants r on r.id = m.restaurant_id
 where m.user_id = auth.uid() and m.restaurant_id = rid and r.status = 'active'
 and (ability = 'read' or (ability in ('catalog','publish') and m.role in ('RESTAURANT_OWNER','RESTAURANT_MANAGER'))
 or (ability in ('settings','credentials','members') and m.role = 'RESTAURANT_OWNER')));
$$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,name) values(new.id,coalesce(new.raw_user_meta_data->>'name',''));
 return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id = auth.uid() or public.is_super_admin());
-- Sem UPDATE para authenticated: metadados enviados no cadastro nunca elevam privilégios.
alter table public.restaurants enable row level security;
create policy restaurants_read on public.restaurants for select to authenticated using(public.has_restaurant_access(id));
create policy restaurants_insert on public.restaurants for insert to authenticated with check(public.is_super_admin());
create policy restaurants_update on public.restaurants for update to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
alter table public.memberships enable row level security;
create policy memberships_read on public.memberships for select to authenticated using(user_id = auth.uid() or public.has_restaurant_access(restaurant_id,'members'));
-- Gerenciamento de membros somente pela função controlada abaixo.
alter table public.plans enable row level security;
create policy plans_read on public.plans for select to authenticated using(true);
create policy plans_admin on public.plans for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());

do $$ declare t text; begin
 foreach t in array array['categories','products','extras','product_extras','hours'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy tenant_read on public.%I for select to authenticated using(public.has_restaurant_access(restaurant_id))',t);
 execute format('create policy tenant_insert on public.%I for insert to authenticated with check(public.has_restaurant_access(restaurant_id,''catalog''))',t);
 execute format('create policy tenant_update on public.%I for update to authenticated using(public.has_restaurant_access(restaurant_id,''catalog'')) with check(public.has_restaurant_access(restaurant_id,''catalog''))',t);
 execute format('create policy tenant_delete on public.%I for delete to authenticated using(public.has_restaurant_access(restaurant_id,''catalog''))',t);
 end loop;
 foreach t in array array['subscriptions','payments','integrations','publications','audit_logs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy tenant_read on public.%I for select to authenticated using(public.has_restaurant_access(restaurant_id))',t);
 end loop;
end $$;
create policy subscriptions_admin on public.subscriptions for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy payments_admin on public.payments for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
alter table public.error_logs enable row level security;
create policy errors_admin on public.error_logs for select to authenticated using(public.is_super_admin());
alter table private.integration_credentials enable row level security;

-- Nenhum registro pode ser transferido para outro restaurante, mesmo com acesso aos dois.
create function public.prevent_tenant_move() returns trigger language plpgsql set search_path = '' as $$
begin
 if old.restaurant_id is distinct from new.restaurant_id then raise exception 'Tenant is immutable' using errcode = '42501'; end if;
 return new;
end; $$;
create function public.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$
declare row_data jsonb; rid uuid;
begin
 row_data := case when TG_OP = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
 rid := case when TG_TABLE_NAME = 'restaurants' then (row_data->>'id')::uuid else (row_data->>'restaurant_id')::uuid end;
 insert into public.audit_logs(restaurant_id,actor_id,action,entity,entity_id,metadata)
 values(rid,auth.uid(),TG_OP,TG_TABLE_NAME,row_data->>'id',jsonb_build_object('name',row_data->>'name','status',row_data->>'status','role',row_data->>'role','platform_role',row_data->>'platform_role','plan_id',row_data->>'plan_id','price',row_data->>'price','monthly_price',row_data->>'monthly_price','active',row_data->>'active','product_limit',row_data->>'product_limit','publication_limit',row_data->>'publication_limit','integration_limit',row_data->>'integration_limit'));
 return coalesce(new,old);
end; $$;
do $$ declare t text; begin
 foreach t in array array['memberships','categories','products','extras','product_extras','hours','subscriptions','payments','integrations','publications'] loop
 execute format('create trigger immutable_tenant before update on public.%I for each row execute function public.prevent_tenant_move()',t);
 execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.audit_change()',t);
 end loop;
end $$;
create trigger audit_changes after insert or update on public.restaurants for each row execute function public.audit_change();

-- Limites aplicados dentro da transação. A trava evita ultrapassagem por concorrência.
create function public.enforce_product_limit() returns trigger language plpgsql security definer set search_path = '' as $$
declare lim integer;
begin
 perform 1 from public.restaurants where id = new.restaurant_id for update;
 select p.product_limit into lim from public.subscriptions s join public.plans p on p.id=s.plan_id
 where s.restaurant_id=new.restaurant_id and s.status in ('active','trialing') and s.current_period_end > now()
 and (s.status <> 'trialing' or s.trial_ends_at > now());
 if lim is null or (select count(*) from public.products where restaurant_id=new.restaurant_id) >= lim then
 raise exception 'Product limit or subscription invalid' using errcode='42501'; end if;
 return new;
end; $$;
create trigger product_limit before insert on public.products for each row execute function public.enforce_product_limit();

create function public.update_restaurant(rid uuid, new_name text, new_email text, new_phone text, new_address text) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.has_restaurant_access(rid,'settings') then raise insufficient_privilege; end if;
 if length(new_name) not between 2 and 120 or length(new_email)>254 or length(new_phone)>30 or length(new_address)>300 then raise check_violation; end if;
 update public.restaurants set name=new_name,email=new_email,phone=new_phone,address=new_address where id=rid;
end; $$;
create function public.manage_member(rid uuid, uid uuid, new_role public.restaurant_role) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.has_restaurant_access(rid,'members') then raise insufficient_privilege; end if;
 perform 1 from public.restaurants where id=rid for update;
 if not public.is_super_admin() and (new_role='RESTAURANT_OWNER' or exists(select 1 from public.memberships where restaurant_id=rid and user_id=uid and role='RESTAURANT_OWNER')) then raise insufficient_privilege; end if;
 insert into public.memberships(restaurant_id,user_id,role) values(rid,uid,new_role)
 on conflict(restaurant_id,user_id) do update set role=excluded.role;
end; $$;
create function public.connect_integration(rid uuid, target_provider text, encrypted_value text default null) returns void language plpgsql security definer set search_path = '' as $$
declare lim integer;
begin
 if not public.has_restaurant_access(rid,'credentials') then raise insufficient_privilege; end if;
 if target_provider not in ('ifood','99food') then raise check_violation; end if;
 perform 1 from public.restaurants where id=rid for update;
 select p.integration_limit into lim from public.subscriptions s join public.plans p on p.id=s.plan_id
 where s.restaurant_id=rid and s.status in ('active','trialing') and s.current_period_end>now() and (s.status<>'trialing' or s.trial_ends_at>now());
 if lim is null or (not exists(select 1 from public.integrations where restaurant_id=rid and provider=target_provider and status='simulated') and (select count(*) from public.integrations where restaurant_id=rid and status='simulated') >= lim) then raise insufficient_privilege; end if;
 insert into public.integrations(restaurant_id,provider,status) values(rid,target_provider,'simulated')
 on conflict(restaurant_id,provider) do update set status='simulated',updated_at=now();
 if encrypted_value is not null then
 insert into private.integration_credentials(restaurant_id,provider,ciphertext) values(rid,target_provider,encrypted_value)
 on conflict(restaurant_id,provider) do update set ciphertext=excluded.ciphertext,updated_at=now();
 end if;
end; $$;
create function public.disconnect_integration(rid uuid, target_provider text) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.has_restaurant_access(rid,'credentials') then raise insufficient_privilege; end if;
 update public.integrations set status='disconnected',updated_at=now() where restaurant_id=rid and provider=target_provider;
 delete from private.integration_credentials where restaurant_id=rid and provider=target_provider;
end; $$;
create function public.publish_menu(rid uuid, target_provider text, request_key uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare lim integer; result_id uuid; menu jsonb;
begin
 if not public.has_restaurant_access(rid,'publish') then raise insufficient_privilege; end if;
 perform 1 from public.restaurants where id=rid for update;
 select id into result_id from public.publications where restaurant_id=rid and request_id=request_key;
 if result_id is not null then return result_id; end if;
 if not exists(select 1 from public.integrations where restaurant_id=rid and provider=target_provider and status='simulated') then raise exception 'Integration disconnected' using errcode='42501'; end if;
 select p.publication_limit into lim from public.subscriptions s join public.plans p on p.id=s.plan_id
 where s.restaurant_id=rid and s.status in ('active','trialing') and s.current_period_end>now() and (s.status<>'trialing' or s.trial_ends_at>now());
 if lim is null or (select count(*) from public.publications where restaurant_id=rid and created_at>=date_trunc('month',now()))>=lim then raise insufficient_privilege; end if;
 select jsonb_agg(jsonb_build_object('id',id,'name',name,'price',price,'category_id',category_id)) into menu from public.products where restaurant_id=rid and active;
 if menu is null then raise exception 'Menu empty' using errcode='42501'; end if;
 insert into public.publications(restaurant_id,provider,status,product_count,snapshot,created_by,request_id)
 values(rid,target_provider,'simulated',jsonb_array_length(menu),menu,auth.uid(),request_key) returning id into result_id;
 return result_id;
end; $$;

-- Privilégios explícitos: nenhuma função fica executável para PUBLIC/anon.
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
revoke all on public.audit_logs,public.publications,public.integrations,public.memberships,public.profiles,public.error_logs from authenticated;
grant select on public.audit_logs,public.publications,public.integrations,public.memberships,public.profiles,public.error_logs to authenticated;
revoke execute on all functions in schema public from public,anon;
grant execute on function public.is_super_admin(),public.has_restaurant_access(uuid,text),public.update_restaurant(uuid,text,text,text,text),public.manage_member(uuid,uuid,public.restaurant_role),public.connect_integration(uuid,text,text),public.disconnect_integration(uuid,text),public.publish_menu(uuid,text,uuid) to authenticated;
