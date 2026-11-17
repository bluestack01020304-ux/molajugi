-- 초대한 사람만 가입하게 하는 장치. 지인끼리만 쓰는 배포를 위한 것이다.
--  - signup_allowlist가 비어 있으면: 누구나 가입할 수 있다 (로컬 개발, 테스트).
--  - 한 줄이라도 있으면: 거기 적힌 이메일만 가입할 수 있다.
-- 이메일은 대시보드의 표 편집기나 SQL로 넣는다. 예:
--   insert into signup_allowlist (email, note) values ('friend@example.com', '민수');
-- 이미 가입한 계정에는 영향이 없다 (가입할 때만 검사한다).

create table public.signup_allowlist (
  email text primary key check (email = lower(email)),
  note text,
  created_at timestamptz default now()
);

-- 정책을 두지 않는다: 앱(로그인한 사용자)은 이 표를 읽지도 쓰지도 못하고, 관리자(대시보드·서비스 역할)만 다룬다.
alter table public.signup_allowlist enable row level security;

-- 가입 트리거에 검사를 더한다. 여전히 이 함수가 허용된 유일한 PL/pgSQL이다.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.signup_allowlist)
     and not exists (select 1 from public.signup_allowlist where email = lower(new.email)) then
    raise exception 'SIGNUP_NOT_ALLOWED: % is not on the invite list', new.email;
  end if;
  insert into public.profiles (id, nickname) values (new.id, split_part(new.email, '@', 1));
  insert into public.wallets (user_id) values (new.id);
  return new;
end;
$$;
