"use client";

import { IntegrationButton } from "@/components/integrations/IntegrationButton";

export function FigmaImportButton({ projectId }: { projectId: string }) {
  return (
    <IntegrationButton
      provider="figma"
      projectId={projectId}
      icon="ti-brand-figma"
      label="Import from Figma"
    />
  );
}
