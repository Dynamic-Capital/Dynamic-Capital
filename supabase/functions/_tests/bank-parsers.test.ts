import { assertEquals } from "std/assert/mod.ts";
import { parseBankSlip } from "../telegram-bot/bank-parsers.ts";

Deno.test("parseBankSlip detects MIB statuses", () => {
  const baseSlip =
    `Maldives Islamic Bank\nTransaction Date : 2024-01-02 12:34:56\nTo Account 1234567890 Dynamic Capital\nReference # REF123\nAmount MVR 250.00`;

  const cases: Array<
    { text: string; expected: "SUCCESS" | "FAILED" | "PENDING" }
  > = [
    { text: `${baseSlip}\nStatus : Successful`, expected: "SUCCESS" },
    {
      text: `${baseSlip}\nTransaction Status Failed due to error`,
      expected: "FAILED",
    },
    { text: `${baseSlip}\nStatus : Processing`, expected: "PENDING" },
  ];

  for (const { text, expected } of cases) {
    const parsed = parseBankSlip(text);
    assertEquals(parsed.bank, "MIB");
    assertEquals(parsed.status, expected);
  }
});
