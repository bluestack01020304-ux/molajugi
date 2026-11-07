-- RLS: 클라이언트는 읽기 위주, 돈/추첨 테이블 쓰기는 서비스 역할만.

create or replace function public.is_winner(listing uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from draws d
    where d.listing_id = listing and d.buyer_id = auth.uid() and d.result = 'win'
  );
$$;
revoke all on function public.is_winner(uuid) from public, anon;
grant execute on function public.is_winner(uuid) to authenticated;

alter table profiles            enable row level security;
alter table wallets             enable row level security;
alter table wallet_transactions enable row level security;
alter table listings            enable row level security;
alter table listing_secrets     enable row level security;
alter table draws               enable row level security;
alter table settlements         enable row level security;
alter table notifications       enable row level security;
alter table app_config          enable row level security;

create policy profiles_select_own on profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_own on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy wallets_select_own on wallets for select to authenticated using (user_id = auth.uid());
create policy wallet_tx_select_own on wallet_transactions for select to authenticated using (user_id = auth.uid());
create policy draws_select_own on draws for select to authenticated using (buyer_id = auth.uid());
create policy settlements_select_own on settlements for select to authenticated using (seller_id = auth.uid());

create policy notifications_select_own on notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update_own on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy listings_select on listings for select to authenticated
  using (status = 'active' or seller_id = auth.uid() or public.is_winner(id));
create policy listings_withdraw on listings for update to authenticated
  using (seller_id = auth.uid() and status = 'active') with check (status = 'withdrawn');

create policy listing_secrets_select on listing_secrets for select to authenticated
  using (
    exists (select 1 from listings l where l.id = listing_id and l.seller_id = auth.uid() and l.status <> 'won')
    or public.is_winner(listing_id)
  );

create policy app_config_select on app_config for select to authenticated using (true);

insert into storage.buckets (id, name, public) values ('gifticons', 'gifticons', false)
on conflict (id) do nothing;

create policy gifticons_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'gifticons' and (storage.foldername(name))[1] = auth.uid()::text);
create policy gifticons_select on storage.objects for select to authenticated
  using (
    bucket_id = 'gifticons' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from listing_secrets s
        where s.image_path = name and public.is_winner(s.listing_id)
      )
    )
  );
