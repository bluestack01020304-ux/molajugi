-- 몰아주기 스키마. 비즈니스 규칙은 SQL에 두지 않는다 (규칙 값은 app_config에만).

create table public.app_config (
  key text primary key,
  value jsonb not null
);

insert into public.app_config (key, value) values
  ('probabilities', '[25,50,75]'),
  ('fee_rate', '0.10'),
  ('hold_days', '3'),
  ('expiry_notice_days', '[7,1]'),
  ('min_days_to_list', '2'),
  ('topup_amount', '10000');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text not null,
  push_token text,
  created_at timestamptz default now()
);

create table public.wallets (
  user_id uuid primary key references public.profiles,
  balance int not null default 0 check (balance >= 0)
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles,
  amount int not null,
  kind text not null check (kind in ('topup','draw','settlement','refund')),
  ref_id uuid,
  created_at timestamptz default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles,
  category text not null check (category in ('cafe','convenience','chicken_pizza','bakery','dining','etc')),
  brand text not null,
  product_name text not null,
  face_value int not null check (face_value > 0),
  expires_on date not null,
  probability int not null check (probability in (25,50,75)),
  price int not null check (price > 0),
  status text not null default 'active' check (status in ('active','won','withdrawn','expired')),
  miss_count int not null default 0,
  created_at timestamptz default now()
);

create table public.listing_secrets (
  listing_id uuid primary key references public.listings on delete cascade,
  image_path text not null,
  barcode_number text
);

create table public.draws (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings,
  buyer_id uuid references public.profiles,
  amount int not null,
  result text not null check (result in ('win','miss')),
  created_at timestamptz default now()
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid unique references public.draws,
  seller_id uuid references public.profiles,
  buyer_id uuid references public.profiles,
  gross int not null,
  fee int not null,
  net int not null,
  status text not null check (status in ('completed','held','confirmed','auto_released','disputed','refunded')),
  release_at timestamptz,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles,
  kind text not null,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz default now()
);

create index listings_status_category_idx on public.listings (status, category);
create index draws_buyer_id_idx on public.draws (buyer_id);
create index settlements_status_release_at_idx on public.settlements (status, release_at);
create index notifications_user_id_read_idx on public.notifications (user_id, read);

-- 가입 트리거: 허용된 유일한 PL/pgSQL
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname) values (new.id, split_part(new.email, '@', 1));
  insert into public.wallets (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
