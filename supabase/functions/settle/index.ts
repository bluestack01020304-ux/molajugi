import { sql } from "../_shared/db.ts";
import { requireUser } from "../_shared/auth.ts";
import { HttpError, handle, json } from "../_shared/http.ts";
import { notify } from "../_shared/notify.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function parseBody(req: Request): Promise<{ drawId: string; action: "confirm" | "report" }> {
  const b = await req.json().catch(() => null);
  const id = b?.draw_id;
  const action = b?.action;
  if (typeof id !== "string" || !UUID.test(id)) throw new HttpError(400, "BAD_REQUEST");
  if (action !== "confirm" && action !== "report") throw new HttpError(400, "BAD_REQUEST");
  return { drawId: id, action };
}

Deno.serve(handle(async (req) => {
  const userId = await requireUser(req);
  const { drawId, action } = await parseBody(req);

  return await sql.begin(async (tx) => {
    // 정산 행 잠금: 동시 확인/신고가 직렬화되어 이중 지급이 불가능하다.
    const [st] = await tx`
      select id, seller_id, buyer_id, net, status
      from settlements where draw_id = ${drawId} for update`;
    if (!st) throw new HttpError(400, "BAD_REQUEST");
    if (st.buyer_id !== userId) throw new HttpError(403, "NOT_BUYER");
    if (st.status !== "held") throw new HttpError(409, "SETTLEMENT_NOT_HELD");

    if (action === "confirm") {
      await tx`update settlements set status = 'confirmed', resolved_at = now() where id = ${st.id}`;
      await tx`select 1 from wallets where user_id = ${st.seller_id} for update`;
      await tx`update wallets set balance = balance + ${st.net} where user_id = ${st.seller_id}`;
      await tx`insert into wallet_transactions (user_id, amount, kind, ref_id)
               values (${st.seller_id}, ${st.net}, 'settlement', ${drawId})`;
      await notify(tx, st.seller_id, "settle_confirmed", "정산 완료", `${st.net}P가 들어왔어요`);
      return json({ status: "confirmed" });
    }

    await tx`update settlements set status = 'disputed', resolved_at = null where id = ${st.id}`;
    await notify(tx, st.seller_id, "settle_disputed", "신고 접수", "구매자가 이미 쓰인 바코드라고 신고했어요. 운영자가 확인합니다");
    return json({ status: "disputed" });
  });
}));
