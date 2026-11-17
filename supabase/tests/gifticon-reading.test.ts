import { assertEquals } from "@std/assert";
import { barcodeNumberFromScan, EMPTY_READING, normalizeReading } from "../functions/_shared/gifticon-reading.ts";

Deno.test("normalizeReading keeps well-formed values and tidies whitespace", () => {
  assertEquals(
    normalizeReading({
      brand: "  스타벅스 ",
      product_name: "아이스  아메리카노\nT",
      face_value: 4500,
      expires_on: "2027-03-31",
      barcode_number: "9401-2233 5566",
      category: "cafe",
    }),
    {
      brand: "스타벅스",
      product_name: "아이스 아메리카노 T",
      face_value: 4500,
      expires_on: "2027-03-31",
      barcode_number: "94012233 5566",
      category: "cafe",
    },
  );
});

Deno.test("normalizeReading drops anything malformed instead of passing it on", () => {
  assertEquals(
    normalizeReading({
      brand: "",
      product_name: 123,
      face_value: 4500.5,
      expires_on: "2027-02-30",
      barcode_number: "1234",
      category: "coffee",
    }),
    EMPTY_READING,
  );
  assertEquals(normalizeReading({ face_value: -1, expires_on: "27.03.31", barcode_number: "abc" }), EMPTY_READING);
  assertEquals(normalizeReading({ face_value: 2_000_000_001 }), EMPTY_READING);
});

Deno.test("normalizeReading survives non-object input", () => {
  for (const v of [null, undefined, "text", 42, []]) assertEquals(normalizeReading(v), EMPTY_READING);
});

Deno.test("normalizeReading caps very long text", () => {
  const r = normalizeReading({ brand: "가".repeat(100), product_name: "나".repeat(200) });
  assertEquals([r.brand!.length, r.product_name!.length], [40, 80]);
});

Deno.test("barcodeNumberFromScan groups digits by four and rejects anything else", () => {
  assertEquals(barcodeNumberFromScan("940122335566"), "9401 2233 5566");
  assertEquals(barcodeNumberFromScan(" 12345678901 "), "1234 5678 901");
  for (const bad of ["1234567", "https://example.com/1234567890", "ABC12345678", ""]) {
    assertEquals(barcodeNumberFromScan(bad), null, bad);
  }
});
