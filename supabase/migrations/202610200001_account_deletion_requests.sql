-- Customers initiate deletion; the owner reviews retention and fulfils the request.
-- Existing accounts, orders and customer information are not deleted by this upgrade.
create table if not exists public.account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  status text not null default 'requested' check (status in ('requested', 'reviewing'))
);
alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from public, anon, authenticated;
grant select on public.account_deletion_requests to authenticated;
grant insert(user_id) on public.account_deletion_requests to authenticated;
grant update(status) on public.account_deletion_requests to authenticated;
drop policy if exists "Request own account deletion" on public.account_deletion_requests;
create policy "Request own account deletion"
on public.account_deletion_requests for insert to authenticated
with check (user_id = (select auth.uid()));
drop policy if exists "Read own deletion request or admin queue" on public.account_deletion_requests;
create policy "Read own deletion request or admin queue"
on public.account_deletion_requests for select to authenticated using (
  user_id = (select auth.uid())
  or ((select auth.jwt())->'app_metadata'->>'role') = 'admin'
);
drop policy if exists "Admin reviews deletion requests" on public.account_deletion_requests;
create policy "Admin reviews deletion requests"
on public.account_deletion_requests for update to authenticated
using (((select auth.jwt())->'app_metadata'->>'role') = 'admin')
with check (((select auth.jwt())->'app_metadata'->>'role') = 'admin');

create or replace function public.request_account_deletion()
returns public.account_deletion_requests
language plpgsql security invoker set search_path = ''
as $$
declare
  result public.account_deletion_requests;
begin
  if (select auth.uid()) is null then raise exception 'Sign in to request account deletion'; end if;
  insert into public.account_deletion_requests(user_id)
  values ((select auth.uid())) on conflict(user_id) do nothing;
  select * into result from public.account_deletion_requests where user_id = (select auth.uid());
  return result;
end;
$$;
revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;
