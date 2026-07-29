import { InvoiceDetail } from "@/components/invoices";

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceRoute({ params }: InvoicePageProps) {
  const { id } = await params;
  return <InvoiceDetail invoiceId={id} />;
}
