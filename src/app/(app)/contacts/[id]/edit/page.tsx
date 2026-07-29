import { ContactForm } from "@/components/contacts";

interface EditContactPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditContactRoute({ params }: EditContactPageProps) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Modifier le contact</h1>
      <ContactForm contactId={id} />
    </div>
  );
}
