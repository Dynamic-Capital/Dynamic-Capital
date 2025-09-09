import { NextResponse } from "next/server";

interface HelloResponse {
  message: string;
}

interface ErrorResponse {
  error: string;
}

export async function GET() {
  try {
    const body: HelloResponse = { message: "Hello from the API" };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const body: ErrorResponse = { error: message };
    return NextResponse.json(body, { status: 500 });
  }
}
