import { assertEquals, assertRejects } from "@std/assert";
import {
  calcPrice,
  canList,
  isNoticeDue,
  rollOutcome,
  shouldDelist,
  splitFee,
  todayKst,
  type Rules,
} from "../functions/_shared/rules.ts";
import { loadRules } from "../functions/_shared/config.ts";
import { sql } from "./helpers.ts";

const R: Rules = { probabilities:[25,50,75], feeRate:0.10, holdDays:3, expiryNoticeDays:[7,1], minDaysToList:2, topupAmount:10000 };
Deno.test("calcPrice rounds to 10 won", () => {
  assertEquals(calcPrice(2000, 50), 1000);
  assertEquals(calcPrice(4500, 25), 1130);
  assertEquals(calcPrice(9900, 50), 4950);
});
Deno.test("splitFee 10% of 1130 is 113", () => assertEquals(splitFee(1130, 0.10), { fee: 113, net: 1017 }));
Deno.test("rollOutcome boundary", () => {
  assertEquals(rollOutcome(50, 0.499), "win");
  assertEquals(rollOutcome(50, 0.5), "miss");
  assertEquals(rollOutcome(25, 0.25), "miss");
});
Deno.test("todayKst uses Asia/Seoul", () => assertEquals(todayKst(new Date("2026-11-07T16:00:00Z")), "2026-11-08"));
Deno.test("listing window", () => {
  assertEquals(canList("2026-11-09", "2026-11-07", R), true);
  assertEquals(canList("2026-11-08", "2026-11-07", R), false);
  assertEquals(shouldDelist("2026-11-08", "2026-11-07"), true);
  assertEquals(shouldDelist("2026-11-09", "2026-11-07"), false);
  assertEquals(isNoticeDue("2026-11-14", "2026-11-07", R), true);
  assertEquals(isNoticeDue("2026-11-13", "2026-11-07", R), false);
});
Deno.test("loadRules reads app_config", async () => {
  const r = await loadRules(sql);
  assertEquals(r.feeRate, 0.10); assertEquals(r.probabilities, [25,50,75]);
});
Deno.test("loadRules names the key when a value has the wrong shape", async () => {
  // 트랜잭션 안에서만 값을 망가뜨리고 롤백한다 (다른 테스트에 영향 없음).
  const ROLLBACK = new Error("rollback");
  for (const [key, value] of [["fee_rate", '"0.1"'], ["probabilities", "[25,30]"], ["hold_days", "1.5"]]) {
    await assertRejects(
      () => sql.begin(async (tx) => {
        await tx`update app_config set value = ${value}::jsonb where key = ${key}`;
        await loadRules(tx as unknown as typeof sql); // 형식 오류면 여기서 key 이름을 담아 throw
        throw ROLLBACK; // 통과해 버리면 메시지에 key가 없어 assertRejects가 실패한다
      }),
      Error,
      key,
    );
  }
  assertEquals((await loadRules(sql)).feeRate, 0.10);
});
