import { NextResponse } from "next/server";
import { z } from "zod";
import { AIConfigurationError, AIResponseValidationError, AITimeoutError, runStructuredAction, type AIAction } from "@/infrastructure/openai";
import { getServerEnvironment, ServerEnvironmentError } from "@/infrastructure/server-env";

const actions = new Set<AIAction>(["analysis", "questions", "scope", "estimate", "review"]);
const RequestSchema = z.object({
  projectMode: z.enum(["live", "demo"]),
  payload: z.record(z.string(), z.unknown()),
});

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!actions.has(action as AIAction)) return NextResponse.json({ error: "Unknown AI action" }, { status: 404 });
  try {
    const environment = getServerEnvironment();
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > environment.MAX_AI_PAYLOAD_BYTES) return NextResponse.json({ error: "The AI request is too large.", code: "AI_PAYLOAD_TOO_LARGE" }, { status: 413 });
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > environment.MAX_AI_PAYLOAD_BYTES) return NextResponse.json({ error: "The AI request is too large.", code: "AI_PAYLOAD_TOO_LARGE" }, { status: 413 });
    const { projectMode, payload } = RequestSchema.parse(JSON.parse(rawBody));
    if (environment.DEPLOYMENT_PROFILE === "public_demo" && projectMode === "live") {
      return NextResponse.json({ error: "Live AI is disabled on this public demonstration.", code: "PUBLIC_LIVE_DISABLED" }, { status: 403 });
    }
    const result = await runStructuredAction(action as AIAction, payload, { projectMode });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AIConfigurationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 503 });
    }
    if (error instanceof AITimeoutError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 504 });
    }
    if (error instanceof AIResponseValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 502 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid AI request", code: "INVALID_REQUEST" }, { status: 400 });
    }
    if (error instanceof ServerEnvironmentError) {
      return NextResponse.json({ error: "The server configuration is invalid.", code: error.code }, { status: 503 });
    }
    const requestId = error && typeof error === "object" && "request_id" in error && typeof error.request_id === "string" ? error.request_id : null;
    return NextResponse.json({ error: "The AI request failed. Your project data was preserved.", code: "AI_REQUEST_FAILED", requestId }, { status: 502 });
  }
}
