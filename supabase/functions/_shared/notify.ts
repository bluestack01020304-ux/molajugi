import type { Tx } from "./db.ts";

export async function notify(
  tx: Tx,
  userId: string,
  kind: string,
  title: string,
  body: string,
): Promise<void> {
  await tx`insert into notifications (user_id, kind, title, body) values (${userId}, ${kind}, ${title}, ${body})`;
  const [p] = await tx`select push_token from profiles where id = ${userId}`;
  if (p?.push_token) {
    // fire-and-forget: 푸시 실패가 트랜잭션에 영향을 주지 않는다
    fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: p.push_token, title, body }),
    }).catch(() => {});
  }
}
