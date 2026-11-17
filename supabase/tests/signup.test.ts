import { assert, assertEquals } from "@std/assert";
import { createClient } from "@supabase/supabase-js";
import { sql } from "./helpers.ts";

// 실제 회원가입 흐름: 가입 → 인증 메일(6자리 코드) → 코드 확인 → 로그인.
// 로컬에서는 메일이 실제로 나가지 않고 Mailpit(http://127.0.0.1:54324)에 쌓인다.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const MAILPIT_URL = Deno.env.get("MAILPIT_URL") ?? "http://127.0.0.1:54324";

const newClient = () =>
  createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const newEmail = () => `signup-${crypto.randomUUID()}@test.local`;

/** 받은 메일함에서 이 주소로 온 가장 최근 메일의 제목과 본문(텍스트)을 읽는다. */
async function latestMail(to: string): Promise<{ subject: string; text: string }> {
  for (let i = 0; i < 20; i++) {
    const list = await (await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`)).json();
    const first = list.messages?.[0];
    if (first) {
      const m = await (await fetch(`${MAILPIT_URL}/api/v1/message/${first.ID}`)).json();
      return { subject: m.Subject, text: `${m.Text}\n${m.HTML}` };
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no mail arrived for ${to}`);
}

const codeIn = (text: string) => text.match(/\b(\d{6})\b/)?.[1];

Deno.test("signup does not log in until the emailed code is confirmed", async () => {
  const email = newEmail();
  const client = newClient();
  const { data, error } = await client.auth.signUp({ email, password: "test1234" });
  assertEquals(error, null);
  assertEquals(data.session, null); // 인증 전에는 세션을 주지 않는다

  const blocked = await client.auth.signInWithPassword({ email, password: "test1234" });
  assertEquals(blocked.error?.code, "email_not_confirmed");

  const mail = await latestMail(email);
  assert(mail.subject.includes("몰아주기"), `subject: ${mail.subject}`);
  const code = codeIn(mail.text);
  assert(code, "mail should contain a 6-digit code");

  const wrong = await client.auth.verifyOtp({ email, token: code === "000000" ? "111111" : "000000", type: "email" });
  assert(wrong.error, "a wrong code must be rejected");

  const ok = await client.auth.verifyOtp({ email, token: code, type: "email" });
  assertEquals(ok.error, null);
  assert(ok.data.session, "confirming the code should log the user in");

  // 가입 트리거가 프로필과 지갑을 만들었는지
  const [row] = await sql`
    select p.nickname, w.balance from profiles p join wallets w on w.user_id = p.id
    where p.id = ${ok.data.user!.id}`;
  assertEquals([row.nickname, row.balance], [email.split("@")[0], 0]);

  const login = await newClient().auth.signInWithPassword({ email, password: "test1234" });
  assertEquals(login.error, null);
});

Deno.test("signing up again with a registered email does not create a second account", async () => {
  const email = newEmail();
  const first = await newClient().auth.signUp({ email, password: "test1234" });
  const code = codeIn((await latestMail(email)).text)!;
  assertEquals((await newClient().auth.verifyOtp({ email, token: code, type: "email" })).error, null);

  const again = await newClient().auth.signUp({ email, password: "other-password" });
  assertEquals(again.data.session, null);
  // 이미 인증된 주소로 다시 가입하면 서버는 주소 존재 여부를 숨기려고 identities가 빈 가짜 유저를 돌려준다.
  assertEquals(again.data.user?.identities?.length ?? 0, 0);
  const [{ count }] = await sql`select count(*)::int from auth.users where email = ${email}`;
  assertEquals(count, 1);
  assert(first.data.user);
});

Deno.test("when the invite list has entries, only invited emails can sign up", async () => {
  const invited = newEmail();
  const stranger = newEmail();
  // 대소문자가 달라도 같은 주소로 본다.
  await sql`insert into signup_allowlist (email, note) values (${invited}, 'test')`;
  try {
    const blocked = await newClient().auth.signUp({ email: stranger, password: "test1234" });
    assert(blocked.error, "an uninvited email must be rejected");
    // 가입 트리거가 막으면 인증 서버는 500을 돌려준다. 앱(lib/auth.ts)이 이를 초대 안내 문구로 바꾼다.
    assertEquals(blocked.error.status, 500);
    const [{ count }] = await sql`select count(*)::int from auth.users where email = ${stranger}`;
    assertEquals(count, 0);

    const ok = await newClient().auth.signUp({ email: invited.toUpperCase(), password: "test1234" });
    assertEquals(ok.error, null);
    assert(ok.data.user, "an invited email signs up as usual");
  } finally {
    // 목록을 비워 두지 않으면 다른 테스트의 계정 생성이 모두 막힌다.
    await sql`delete from signup_allowlist where note = 'test'`;
  }
  const open = await newClient().auth.signUp({ email: newEmail(), password: "test1234" });
  assertEquals(open.error, null); // 목록이 비면 다시 누구나 가입할 수 있다
});
