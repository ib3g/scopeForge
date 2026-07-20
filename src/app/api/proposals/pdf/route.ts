import { renderToBuffer } from "@react-pdf/renderer";
import { ClientDocumentSchema } from "@/domain/client-document";
import { ClientProposalPdf } from "@/infrastructure/client-proposal-pdf";
import { getServerEnvironment, ServerEnvironmentError } from "@/infrastructure/server-env";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const environment = getServerEnvironment();
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > environment.MAX_PDF_PAYLOAD_BYTES)
      return Response.json({ error: "The proposal is too large to export." }, { status: 413 });
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > environment.MAX_PDF_PAYLOAD_BYTES)
      return Response.json({ error: "The proposal is too large to export." }, { status: 413 });
    const body = JSON.parse(rawBody) as { document?: unknown };
    const document = ClientDocumentSchema.parse(body.document);
    if (document.status !== "validated") return Response.json({ error: "Only validated client proposals can be exported" }, { status: 409 });
    const pdf = await renderToBuffer(ClientProposalPdf({ document }));
    const filename = `${document.settings.reference || "scopeforge-proposal"}.pdf`.replace(/[^a-z0-9_.-]/gi, "-");
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof ServerEnvironmentError
      ? "The server configuration is invalid."
      : error instanceof Error
        ? error.message
        : "PDF generation failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
