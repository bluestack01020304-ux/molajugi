import { assertEquals } from "@std/assert";
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
