import { notFound } from "next/navigation";
import { getServerEnvironment } from "@/infrastructure/server-env";

export const dynamic = "force-dynamic";

export default function ComponentLabLayout({ children }: { children: React.ReactNode }) {
  const environment = getServerEnvironment();
  if (environment.DEPLOYMENT_PROFILE === "public_demo" || !environment.ENABLE_COMPONENT_LAB) notFound();
  return children;
}
