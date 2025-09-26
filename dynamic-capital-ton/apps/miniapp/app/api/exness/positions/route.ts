import { NextResponse } from "next/server";

import { getOpenPositions } from "../../../../../lib/exness";

export async function GET() {
  try {
    const { data, source } = await getOpenPositions();
    return NextResponse.json({ data, source });
  } catch (error) {
    console.error("Failed to fetch Exness positions", error);
    return NextResponse.json(
      { error: "Unable to load open positions" },
      { status: 500 },
    );
  }
}
