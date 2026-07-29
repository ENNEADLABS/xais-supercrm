import { ContactDetail } from "@/components/contacts";

interface ContactPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactRoute({ params }: ContactPageProps) {
  const { id } = await params;
  return <ContactDetail contactId={id} />;
}
