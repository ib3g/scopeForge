import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { DocumentExtractionError, extractDocument, type SupportedDocumentKind } from "@/infrastructure/document-extraction";
import { getServerEnvironment, ServerEnvironmentError } from "@/infrastructure/server-env";

const RequestSchema = z.object({
  filename: z.string().min(1).max(240),
  mimeType: z.string().max(120),
  data: z.string().min(1),
});

export const runtime = "nodejs";
export const maxDuration = 60;

function kindFor(filename: string, mimeType: string): SupportedDocumentKind | null {
  const extension = filename.toLowerCase().split(".").pop();
  if (extension === "txt" || mimeType === "text/plain") return "text";
  if (extension === "md" || extension === "markdown" || mimeType === "text/markdown") return "markdown";
  if (extension === "pdf" || mimeType === "application/pdf") return "pdf";
  if (extension === "docx" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  return null;
}

export async function POST(request: Request) {
  try {
    const environment = getServerEnvironment();
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    const encodedLimit = Math.ceil(environment.MAX_UPLOAD_BYTES * 1.38) + 4096;
    if (declaredLength > encodedLimit)
      return NextResponse.json({ error: "The document exceeds the configured upload limit." }, { status: 413 });
    const input = RequestSchema.parse(await request.json());
    const kind = kindFor(input.filename, input.mimeType);
    if (!kind) return NextResponse.json({ error: "This file type is not supported." }, { status: 415 });
    const bytes = Buffer.from(input.data, "base64");
    if (!bytes.length || bytes.length > environment.MAX_UPLOAD_BYTES)
      return NextResponse.json({ error: "The document is empty or exceeds the configured upload limit." }, { status: 413 });
    const extraction = extractDocument(bytes, kind);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    return NextResponse.json({
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: bytes.length,
      checksum,
      ...extraction,
    });
  } catch (error) {
    if (error instanceof DocumentExtractionError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
    }
    const message = error instanceof ServerEnvironmentError
      ? "The server configuration is invalid."
      : error instanceof z.ZodError
        ? "Invalid document extraction request."
        : error instanceof Error
          ? "Document extraction failed."
          : "Document extraction failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
