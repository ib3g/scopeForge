import { NextResponse } from "next/server";
import { getAIConfiguration } from "@/infrastructure/openai";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getAIConfiguration(), {
    headers: { "cache-control": "no-store" },
  });
}
