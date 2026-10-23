
begin;
do $test$
declare actor uuid := (select user_id from public.vertexx_member_roles where role='owner' limit 1); run_id uuid; before_balance integer; result jsonb;
begin
 update public.vertexx_member_roles set role='member' where user_id=actor;
 select balance into before_balance from public.vertexx_wallets where user_id=actor;
 run_id:=gen_random_uuid();
 perform public.vertexx_begin_run(actor,run_id,'test-success');
 result:=public.vertexx_finish_run(actor,run_id,true,'{"success":true,"output":"ok"}');
 perform public.vertexx_finish_run(actor,run_id,true,'{"success":true}');
 if (select balance from public.vertexx_wallets where user_id=actor)<>before_balance-1 then raise exception 'Success/retry charge test failed';end if;
 run_id:=gen_random_uuid();perform public.vertexx_begin_run(actor,run_id,'test-failure');
 perform public.vertexx_finish_run(actor,run_id,false,'{"success":false,"output":"","error":"expected"}');
 if (select balance from public.vertexx_wallets where user_id=actor)<>before_balance-1 then raise exception 'Failure charged crystals';end if;
 run_id:=gen_random_uuid();perform public.vertexx_begin_run(actor,run_id,'test-cancel');
 perform public.vertexx_cancel_run(actor,run_id);perform public.vertexx_finish_run(actor,run_id,true,'{"success":true}');
 if (select balance from public.vertexx_wallets where user_id=actor)<>before_balance-1 then raise exception 'Cancellation charged crystals';end if;
 perform public.vertexx_daily_crystals(actor);
 begin perform public.vertexx_daily_crystals(actor);raise exception 'Daily grant accepted twice';exception when others then if sqlerrm='Daily grant accepted twice' then raise;end if;end;
 raise notice 'PASS: one success charge, replay idempotency, free failure/cancellation and daily claim';
end $test$;
select 'PASS: success/retry/failure/cancellation/daily-claim checks; transaction rolled back' as result;
rollback;
