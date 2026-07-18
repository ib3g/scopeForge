import { NextResponse } from "next/server";
import { runStructuredAction, type AIAction } from "@/infrastructure/openai";

const actions = new Set<AIAction>(["analysis", "questions", "scope", "estimate", "review"]);

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!actions.has(action as AIAction)) return NextResponse.json({ error: "Unknown AI action" }, { status: 404 });
  try {
    const payload = await request.json();
    const result = await runStructuredAction(action as AIAction, payload);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
