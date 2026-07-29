import { DocumentsPage } from "@/components/documents";

export default function DocumentsRoute() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Documents</h1>
      <DocumentsPage />
    </div>
  );
}
