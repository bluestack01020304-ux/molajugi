# 몰아주기

안 쓰는 기프티콘을 올리면, 구매자가 액면가보다 싼 값을 내고 정해진 확률(25/50/75%)로 뽑는 앱. Expo 앱(`app/`) + Supabase 백엔드(`supabase/`).

> 법률 검토 전 프로토타입이다. 확률형 상품·결제 관련 법률 상담 결과에 따라 바뀔 수 있다. 배경과 설계는 `docs/superpowers/specs/2026-11-07-molajugi-design.md` 참고.

## 1. 준비물

- Docker Desktop (실행 중이어야 함)
- Node 20+
- Deno 2.x (`deno --version`이 터미널에서 되도록 PATH에 있어야 함. Windows 기본 위치 `%USERPROFILE%\.deno\bin`)
- Supabase CLI: 설치 없이 `npx supabase@latest ...`로 쓴다 (아래 명령 모두 그 형태)
- 폰에 Expo Go

처음이면 `cd app && npm install`을 한 번 한다.

## 2. 로컬 스택

저장소 루트에서:

```
npx supabase@latest start      # API http://127.0.0.1:54321, DB 127.0.0.1:54322
npx supabase@latest status     # 키/URL 확인
npx supabase@latest db reset   # 데이터 전부 삭제 후 마이그레이션(0001~0005) 재적용
```

`db reset`을 하면 Edge Runtime 컨테이너가 같이 내려가므로 아래 함수 서빙을 다시 띄운다.

## 3. 함수 서빙

별도 터미널에서 (끄지 말 것). 용도에 따라 둘 중 하나만 띄운다.

데모·폰 연결용 (디버그 롤 꺼짐, 실제 난수만 사용):

```
npx supabase@latest functions serve --no-verify-jwt
```

Deno 테스트용 (`deno task test`는 이 서빙이 필요하다):

```
npx supabase@latest functions serve --no-verify-jwt --env-file supabase/.env.debug
```

**경고:** `supabase/.env.debug`에는 `ALLOW_DEBUG_ROLL=true`가 들어 있다(테스트용, 커밋되어 있음). 이 값이 켜져 있으면 `draw` 함수가 `x-debug-roll` 헤더로 결과를 고정할 수 있다. 테스트 외에는 쓰지 말고, 이 파일을 호스팅 프로젝트의 secrets(`supabase secrets set --env-file ...`)에 절대 올리지 말 것. 실수로 올려도 `draw`는 `SUPABASE_URL`에 `supabase.co`가 들어 있으면(호스팅) 헤더를 무시한다. `supabase/.env.local`은 주석만 있는 빈 파일이다.

### 매일 작업(daily) 실행

`daily` 함수(유효기간 임박 알림, 만료 매물 내리기, 보류 정산 자동 지급)는 호스팅에서는 pg_cron이 매일 UTC 0시(KST 9시)에 부른다(`0003_cron.sql`). 로컬에서는 pg_cron 대신 손으로 실행한다 (함수 서빙이 떠 있어야 함):

```
cd supabase && deno task daily     # 예: 200 {"expired":0,"noticed":1,"released":0}
```

호스팅 배포 시에는 Studio의 SQL 편집기에서 cron이 부를 주소와 키를 한 번 설정한다:

```sql
alter database postgres set app.daily_url = 'https://<project>.supabase.co/functions/v1/daily';
alter database postgres set app.service_key = '<service role key>';
```

service role 키는 반드시 SQL 편집기에서만 넣고, 이 문장을 마이그레이션이나 저장소 어디에도 커밋하지 말 것.

## 4. 샘플 데이터

```
cd supabase
deno run -A --env-file=.env.test tests/seed.ts
```

`seller@test.local` / `buyer@test.local`(비밀번호 `test1234`, 잔액 각 20,000P)을 만들고 카테고리별 매물 6건을 올린다. 판매자에게 매물이 이미 있으면 매물 생성은 건너뛴다(여러 번 돌려도 중복 없음). 처음부터 다시 하려면 `db reset` 후 재실행.

## 5. 앱 실행

1. `app/.env.example`을 `app/.env`로 복사한다.
2. `ipconfig`로 PC의 IPv4(LAN) 주소를 찾아 `http://<LAN IP>:54321`로 `EXPO_PUBLIC_SUPABASE_URL`을 채운다. `EXPO_PUBLIC_SUPABASE_ANON_KEY`는 `npx supabase@latest status`의 anon key.
3. `cd app && npx expo start` 후 폰(같은 Wi-Fi)의 Expo Go로 QR을 스캔한다.
4. `buyer@test.local` / `test1234`로 로그인해 뽑기, `seller@test.local`로 판매 화면 확인.

## 6. 테스트

```
cd supabase && deno task test      # 로컬 스택 + 테스트용 함수 서빙(--env-file supabase/.env.debug)이 떠 있어야 함 (.env.test는 로컬용으로 채워져 있음)
cd app && npm test
cd app && npx tsc --noEmit
```

## 7. 규칙 바꾸기

규칙은 두 곳에만 있다: DB의 `app_config` 행과 `supabase/functions/_shared/rules.ts`(확률 굴리기, 가격·수수료 계산). 키 여섯 개:

`probabilities`(`[25,50,75]`), `fee_rate`(`0.10`), `hold_days`(`3`), `expiry_notice_days`(`[7,1]`), `min_days_to_list`(`2`), `topup_amount`(`10000`)

앱은 로그인할 때 `app_config`를 한 번 읽어(`app/src/hooks/useRules.tsx`) 확률 버튼, 수수료 미리보기, 정산 보류 일수, 충전 금액 문구에 쓴다. 값을 바꾸면 앱을 다시 열어야 반영된다. `loadRules`는 값의 형식이 틀리면 키 이름을 담아 오류를 낸다.

## 8. 분쟁 처리

구매자가 신고하면 정산이 `disputed`로 멈춘다. 확인 후 SQL 편집기(Studio `http://127.0.0.1:54323` 또는 psql)에서 둘 중 하나를 한 트랜잭션으로 실행한다. `<settlement_id>`는 `settlements.id`.

판매자에게 지급:

```sql
begin;
with s as (
  update settlements set status = 'confirmed', resolved_at = now()
  where id = '<settlement_id>' and status = 'disputed'
  returning seller_id, net, draw_id
), w as (
  update wallets set balance = balance + s.net from s where wallets.user_id = s.seller_id
)
insert into wallet_transactions (user_id, amount, kind, ref_id)
select seller_id, net, 'settlement', draw_id from s;
commit;
```

구매자 환불:

```sql
begin;
with s as (
  update settlements set status = 'refunded', resolved_at = now()
  where id = '<settlement_id>' and status = 'disputed'
  returning buyer_id, gross, draw_id
), w as (
  update wallets set balance = balance + s.gross from s where wallets.user_id = s.buyer_id
)
insert into wallet_transactions (user_id, amount, kind, ref_id)
select buyer_id, gross, 'refund', draw_id from s;
commit;
```

환불 SQL은 일부러 매물을 `won` 상태 그대로, 뽑기(`draws`) 기록도 바꾸지 않고 둔다(기프티콘은 이미 넘어갔고, 뽑기 이력은 그대로 남겨야 하므로 돈만 되돌린다).

## 9. 구조

```
app/src/
  app/         화면 (expo-router: (tabs), draw, gifticon, listing, sell, login)
  components/  ListingRow, ScratchCard, CategoryChips ...
  hooks/       useSession, useWallet, useUnreadCount, useRules
  lib/         api, supabase 클라이언트, format, scratch
supabase/
  migrations/  0001~0005 스키마·RLS
  functions/   create-listing, draw, settle, topup, daily, _shared/rules.ts
  tests/       Deno 테스트, helpers.ts, seed.ts, run-daily.ts
```
