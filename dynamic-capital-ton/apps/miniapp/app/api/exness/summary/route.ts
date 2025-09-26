import { NextResponse } from "next/server";

import { getAccountSummary } from "../../../../../lib/exness";

export async function GET() {
  try {
    const { data, source } = await getAccountSummary();
    return NextResponse.json({ data, source });
  } catch (error) {
    console.error("Failed to fetch Exness account summary", error);
    return NextResponse.json(
      { error: "Unable to load account summary" },
      { status: 500 },
    );
  }
}
