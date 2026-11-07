import { loadRules } from "../_shared/config.ts";
import { sql } from "../_shared/db.ts";
import { requireUser } from "../_shared/auth.ts";
import { HttpError, handle, json } from "../_shared/http.ts";
import { notify } from "../_shared/notify.ts";
import { releaseAt, rollOutcome, secureRandom, shouldDelist, splitFee, todayKst } from "../_shared/rules.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function parseBody(req: Request): Promise<string> {
  const b = await req.json().catch(() => null);
  const id = b?.listing_id;
  if (typeof id !== "string" || !UUID.test(id)) throw new HttpError(400, "BAD_REQUEST");
  return id;
}

// 테스트 전용 롤 고정: env로 허용된 경우에만, 유한한 [0,1) 값일 때만 사용한다.
function pickRandom(req: Request): number {
  const debug = req.headers.get("x-debug-roll");
  if (Deno.env.get("ALLOW_DEBUG_ROLL") === "true" && debug !== null) {
    const v = Number(debug);
    if (debug.trim() !== "" && Number.isFinite(v) && v >= 0 && v < 1) return v;
  }
  return secureRandom();
}

Deno.serve(handle(async (req) => {
  const userId = await requireUser(req);
  const listingId = await parseBody(req);
  const rules = await loadRules(sql);
  const random = pickRandom(req);

  return await sql.begin(async (tx) => {
    // 1. 상품 행 잠금 + 상태/본인 확인
    const [l] = await tx`
      select id, seller_id, product_name, expires_on::text as expires_on, probability, price, status
      from listings where id = ${listingId} for update`;
    if (!l || l.status !== "active" || shouldDelist(l.expires_on, todayKst())) {
      throw new HttpError(409, "LISTING_NOT_ACTIVE");
    }
    if (l.seller_id === userId) throw new HttpError(403, "OWN_LISTING");

    // 2. 구매자·판매자 지갑을 한 문장에서 고정 순서(user_id)로 잠금 (교차 거래 데드락 방지) + 잔액 확인
    const wallets = await tx`
      select user_id, balance from wallets
      where user_id in (${userId}, ${l.seller_id}) order by user_id for update`;
    const w = wallets.find((x) => x.user_id === userId);
    if (!w || w.balance < l.price) throw new HttpError(402, "INSUFFICIENT_BALANCE");

    // 3. 결과 결정 (서버에서만)
    const result = rollOutcome(l.probability, random);

    // 4. draws 기록 (차감 거래의 ref_id로 쓰기 위해 차감보다 먼저)
    const [d] = await tx`
      insert into draws (listing_id, buyer_id, amount, result)
      values (${l.id}, ${userId}, ${l.price}, ${result}) returning id`;
    const { fee, net } = splitFee(l.price, rules.feeRate);

    // 5. 구매자 차감 + 거래 내역
    const [bw] = await tx`
      update wallets set balance = balance - ${l.price} where user_id = ${userId} returning balance`;
    await tx`insert into wallet_transactions (user_id, amount, kind, ref_id)
             values (${userId}, ${-l.price}, 'draw', ${d.id})`;

    // 6. 결과별 정산
    if (result === "miss") {
      await tx`update listings set miss_count = miss_count + 1 where id = ${l.id}`;
      await tx`insert into settlements (draw_id, seller_id, buyer_id, gross, fee, net, status)
               values (${d.id}, ${l.seller_id}, ${userId}, ${l.price}, ${fee}, ${net}, 'completed')`;
      await tx`update wallets set balance = balance + ${net} where user_id = ${l.seller_id}`;
      await tx`insert into wallet_transactions (user_id, amount, kind, ref_id)
               values (${l.seller_id}, ${net}, 'settlement', ${d.id})`;
      await notify(tx, l.seller_id, "draw_miss", "꽝이 났어요", `${l.product_name}에서 ${net}P가 들어왔어요`);
    } else {
      const now = new Date();
      await tx`update listings set status = 'won' where id = ${l.id}`;
      await tx`insert into settlements (draw_id, seller_id, buyer_id, gross, fee, net, status, release_at, created_at)
               values (${d.id}, ${l.seller_id}, ${userId}, ${l.price}, ${fee}, ${net}, 'held',
                       ${releaseAt(now, rules)}, ${now})`;
      await notify(tx, l.seller_id, "draw_win", "당첨됐어요", `${l.product_name}이 넘어갔어요. 구매자 확인 뒤 ${net}P가 들어와요`);
    }
    return json({ draw_id: d.id, result, balance: bw.balance as number });
  });
}));
