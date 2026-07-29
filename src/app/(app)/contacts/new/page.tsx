import { ContactForm } from "@/components/contacts";

export default function NewContactRoute() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nouveau contact</h1>
      <ContactForm />
    </div>
  );
}
