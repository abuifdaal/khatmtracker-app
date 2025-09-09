// app/api/hello/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  // Minimal JSON response so we know API routing works.
  return NextResponse.json({ hello: "world" });
}