import { NextResponse } from "next/server";

import { generateTradeJournal } from "@/services/trade-journal/engine";
import { tradeJournalRequestSchema } from "@/services/trade-journal/schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = tradeJournalRequestSchema.safeParse(payload);

    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join(
        "; ",
      );
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const report = generateTradeJournal(parsed.data);
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
