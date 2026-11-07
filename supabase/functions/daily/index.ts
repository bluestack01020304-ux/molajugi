import { sql } from "../_shared/db.ts";
import { loadRules } from "../_shared/config.ts";
import { HttpError, handle, json } from "../_shared/http.ts";
import { notify } from "../_shared/notify.ts";
import { isNoticeDue, shouldDelist, todayKst, daysLeft } from "../_shared/rules.ts";

Deno.serve(handle(async (req) => {
  // service role 전용: 사용자 JWT는 거부한다.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token || token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) throw new HttpError(401, "UNAUTHORIZED");

  const rules = await loadRules(sql);
  const today = todayKst();

  return await sql.begin(async (tx) => {
    let expired = 0, noticed = 0, released = 0;

    const listings = await tx`
      select id, seller_id, product_name, expires_on::text as expires_on
      from listings where status = 'active' for update`;
    for (const l of listings) {
      if (shouldDelist(l.expires_on, today)) {
        await tx`update listings set status = 'expired' where id = ${l.id}`;
        await notify(tx, l.seller_id, "listing_expired", "유효기간 만료", `${l.product_name}이 내려갔어요`);
        expired++;
      } else if (isNoticeDue(l.expires_on, today, rules)) {
        const d = daysLeft(l.expires_on, today);
        await notify(tx, l.seller_id, "expiry_notice", "유효기간 임박", `${l.product_name}이 ${d}일 남았어요`);
        noticed++;
      }
    }

    const due = await tx`
      select id, seller_id, draw_id, net
      from settlements where status = 'held' and release_at <= now()
      order by seller_id for update`;
    // 관련 판매자 지갑을 한 문장에서 user_id 순으로 잠근다 (draw와 같은 잠금 순서 → 데드락 방지).
    const sellerIds = [...new Set(due.map((st) => st.seller_id as string))];
    if (sellerIds.length > 0) {
      await tx`select user_id from wallets where user_id = any(${sellerIds}::uuid[]) order by user_id for update`;
    }
    for (const st of due) {
      await tx`update settlements set status = 'auto_released', resolved_at = now() where id = ${st.id}`;
      await tx`update wallets set balance = balance + ${st.net} where user_id = ${st.seller_id}`;
      await tx`insert into wallet_transactions (user_id, amount, kind, ref_id)
               values (${st.seller_id}, ${st.net}, 'settlement', ${st.draw_id})`;
      await notify(tx, st.seller_id, "settle_auto", "자동 정산", `${st.net}P가 들어왔어요`);
      released++;
    }

    return json({ expired, noticed, released });
  });
}));
