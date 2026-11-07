import { loadRules } from "../_shared/config.ts";
import { sql } from "../_shared/db.ts";
import { requireUser } from "../_shared/auth.ts";
import { handle, json } from "../_shared/http.ts";

Deno.serve(handle(async (req) => {
  const userId = await requireUser(req);
  const rules = await loadRules(sql);
  const balance = await sql.begin(async (tx) => {
    await tx`select 1 from wallets where user_id = ${userId} for update`;
    const [w] = await tx`
      update wallets set balance = balance + ${rules.topupAmount}
      where user_id = ${userId} returning balance`;
    await tx`insert into wallet_transactions (user_id, amount, kind)
             values (${userId}, ${rules.topupAmount}, 'topup')`;
    return w.balance as number;
  });
  return json({ balance });
}));
