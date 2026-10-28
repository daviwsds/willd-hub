create function public.create_restaurant(details jsonb, selected_plan uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare rid uuid; days integer;
begin
 if not public.is_super_admin() then raise insufficient_privilege; end if;
 select trial_days into days from public.plans where id=selected_plan;
 if days is null then raise check_violation; end if;
 insert into public.restaurants(name,slug,email,phone,address,status)
 values(details->>'name',details->>'slug',details->>'email',coalesce(details->>'phone',''),coalesce(details->>'address',''),coalesce(details->>'status','active')) returning id into rid;
 insert into public.subscriptions(restaurant_id,plan_id,status,trial_ends_at,current_period_end)
 values(rid,selected_plan,'trialing',now()+make_interval(days=>days),now()+make_interval(days=>days));
 return rid;
end; $$;
create function public.record_integration_error(rid uuid, source_name text) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.has_restaurant_access(rid,'publish') then raise insufficient_privilege; end if;
 if source_name not in ('ifood','99food') then raise check_violation; end if;
 insert into public.error_logs(restaurant_id,source,message) values(rid,source_name,'Publicação simulada recusada. Verificar conexão, assinatura e limite do plano.');
end; $$;
revoke execute on function public.create_restaurant(jsonb,uuid),public.record_integration_error(uuid,text) from public,anon;
grant execute on function public.create_restaurant(jsonb,uuid),public.record_integration_error(uuid,text) to authenticated;
