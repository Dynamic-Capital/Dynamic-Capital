import { NextResponse } from "next/server";
import { NODE_ENV } from "@/config/node-env";

export function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
}
