// 로컬에서 pg_cron 대신 daily 함수를 손으로 한 번 실행한다: `cd supabase && deno task daily`
// (함수 서빙이 떠 있어야 한다. 키는 .env.test의 로컬 service role 키.)
const url = Deno.env.get("SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요합니다 (--env-file=.env.test)");
  Deno.exit(1);
}

const res = await fetch(`${url}/functions/v1/daily`, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: "{}",
});
const text = await res.text();
let out: unknown = text;
try {
  out = JSON.parse(text);
} catch {
  // JSON이 아니면 원문 그대로 출력
}
console.log(res.status, JSON.stringify(out));
if (!res.ok) Deno.exit(1);
