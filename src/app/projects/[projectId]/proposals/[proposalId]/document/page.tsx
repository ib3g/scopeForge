import { ClientDocumentPage } from "@/ui/client-document-page";

export default async function ProposalDocumentRoute({ params }: { params: Promise<{ projectId: string; proposalId: string }> }) {
  const { projectId, proposalId } = await params;
  return <ClientDocumentPage projectId={projectId} proposalId={proposalId} />;
}

