-- Mudanças em planos também precisam de auditoria, sem conter credenciais.
alter table public.subscriptions add constraint trial_requires_end check(status <> 'trialing' or trial_ends_at is not null);
create index on public.products(restaurant_id,active);
create index on public.categories(restaurant_id,sort_order);
create index on public.extras(restaurant_id);
create index on public.payments(restaurant_id,created_at);
create trigger audit_changes after insert or update or delete on public.plans for each row execute function public.audit_change();
create trigger audit_changes after update on public.profiles for each row execute function public.audit_change();
-- IDs imutáveis: impedem troca de identidade por administradores via REST.
create function public.prevent_identity_move() returns trigger language plpgsql set search_path = '' as $$
begin
 if old.id is distinct from new.id then raise exception 'Identity is immutable' using errcode='42501'; end if;
 return new;
end; $$;
create trigger immutable_identity before update on public.restaurants for each row execute function public.prevent_identity_move();
revoke execute on function public.prevent_identity_move() from public,anon,authenticated;
