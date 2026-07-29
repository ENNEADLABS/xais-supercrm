import { IdeaForm } from "@/components/studio";

export default function NewStudioIdeaRoute() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nouvelle idée</h1>
      <IdeaForm />
    </div>
  );
}
