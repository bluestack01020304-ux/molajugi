# 몰아주기

- 준비물: Docker Desktop(필수, 실행 중이어야 함), Supabase CLI, Deno 2.x, Node 20+
- 로컬 백엔드: `supabase start` (API http://127.0.0.1:54321, DB postgresql://postgres:postgres@127.0.0.1:54322/postgres)
- 앱: `cd app && npx expo start`
- 백엔드 테스트: `cd supabase && deno task test` (`supabase/.env.test`를 `supabase status` 값으로 채워야 함)
- 함수 서빙(테스트 전 별도 터미널): `npx supabase@latest functions serve --no-verify-jwt --env-file supabase/.env.local`
- 앱 환경변수: app/.env.example을 app/.env로 복사해 PC의 LAN IP와 anon key를 채운다
