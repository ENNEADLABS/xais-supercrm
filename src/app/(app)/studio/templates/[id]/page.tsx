"use client";

import { use } from "react";
import { Loader2 } from "lucide-react";
import { TemplateForm } from "@/components/studio";
import { useContentTemplate } from "@/lib/hooks/useContentTemplates";

export default function EditStudioTemplateRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: template, isLoading } = useContentTemplate(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) {
    return <p className="text-sm text-muted-foreground">Template introuvable.</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Éditer le template</h1>
      <TemplateForm template={template} />
    </div>
  );
}
