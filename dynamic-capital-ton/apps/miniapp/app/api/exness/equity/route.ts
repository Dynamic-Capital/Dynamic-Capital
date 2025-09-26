import { NextResponse } from "next/server";

import { getEquityHistory } from "../../../../../lib/exness";

export async function GET() {
  try {
    const { data, source } = await getEquityHistory();
    return NextResponse.json({ data, source });
  } catch (error) {
    console.error("Failed to fetch Exness equity history", error);
    return NextResponse.json(
      { error: "Unable to load equity history" },
      { status: 500 },
    );
  }
}
