import { NextResponse } from "next/server";
import { z } from "zod";
import { AIConfigurationError, runStructuredAction, type AIAction } from "@/infrastructure/openai";

const actions = new Set<AIAction>(["analysis", "questions", "scope", "estimate", "review"]);
const RequestSchema = z.object({
  projectMode: z.enum(["live", "demo"]),
  payload: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!actions.has(action as AIAction)) return NextResponse.json({ error: "Unknown AI action" }, { status: 404 });
  try {
    const { projectMode, payload } = RequestSchema.parse(await request.json());
    const result = await runStructuredAction(action as AIAction, payload, { projectMode });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AIConfigurationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 503 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid AI request", code: "INVALID_REQUEST" }, { status: 400 });
    }
    const requestId = error && typeof error === "object" && "request_id" in error && typeof error.request_id === "string" ? error.request_id : null;
    return NextResponse.json({ error: "The AI request failed. Your project data was preserved.", code: "AI_REQUEST_FAILED", requestId }, { status: 502 });
  }
}
