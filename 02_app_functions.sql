-- Run after the main schema you already ran.
create or replace function public.claim_due_eggs() returns json language plpgsql security definer set search_path=public as $$
declare p record; n integer; total integer:=0; value numeric(12,2);
begin
 if auth.uid() is null then raise exception 'Login required'; end if;
 select egg_value into value from public.site_settings where id=1;
 for p in select dp.id,dp.user_id,dp.last_egg_at,dp.expiry_date,d.egg_interval_hours from public.duck_purchases dp join public.ducks d on d.id=dp.duck_id where dp.user_id=auth.uid() and dp.status='active' and dp.expiry_date>now() and dp.last_egg_at is not null and now()>=dp.last_egg_at+make_interval(hours=>d.egg_interval_hours) for update of dp loop
   n:=floor(extract(epoch from(now()-p.last_egg_at))/(p.egg_interval_hours*3600));
   if n>0 then
     insert into public.egg_transactions(user_id,duck_purchase_id,eggs,amount,transaction_type,description) values(p.user_id,p.id,n,n*value,'egg','Eggs generated from duck');
     update public.egg_wallets set balance=balance+n*value,total_eggs=total_eggs+n,updated_at=now() where user_id=p.user_id;
     update public.duck_purchases set last_egg_at=p.last_egg_at+make_interval(hours=>(n*p.egg_interval_hours)),updated_at=now() where id=p.id;
     total:=total+n;
   end if;
 end loop;
 return json_build_object('eggs_added',total,'message',case when total>0 then 'New eggs added to your wallet.' else 'No eggs are due yet.' end);
end;$$;
grant execute on function public.claim_due_eggs() to authenticated;

create or replace function public.create_withdrawal(withdrawal_amount numeric,withdrawal_method text,withdrawal_account text) returns uuid language plpgsql security definer set search_path=public as $$
declare b numeric(12,2); id uuid;
begin
 if auth.uid() is null then raise exception 'Login required'; end if;
 if withdrawal_amount<=0 then raise exception 'Amount must be greater than zero'; end if;
 select balance into b from public.egg_wallets where user_id=auth.uid() for update;
 if b is null or b<withdrawal_amount then raise exception 'Insufficient wallet balance'; end if;
 update public.egg_wallets set balance=balance-withdrawal_amount,updated_at=now() where user_id=auth.uid();
 insert into public.withdrawal_requests(user_id,amount,payment_method,account_number,status) values(auth.uid(),withdrawal_amount,withdrawal_method,withdrawal_account,'pending') returning id into id;
 return id;
end;$$;
grant execute on function public.create_withdrawal(numeric,text,text) to authenticated;
