import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface HelloResponse {
  message: string;
}

interface ErrorResponse {
  error: string;
}

export async function GET() {
  try {
    const body: HelloResponse = { message: "Hello from the API" };
    return NextResponse.json(body, { headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const body: ErrorResponse = { error: message };
    return NextResponse.json(body, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function methodNotAllowed() {
  return NextResponse.json({ error: "Method Not Allowed" }, {
    status: 405,
    headers: corsHeaders,
  });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
