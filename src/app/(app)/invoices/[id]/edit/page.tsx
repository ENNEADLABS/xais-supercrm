import { InvoiceForm } from "@/components/invoices";

interface EditInvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditInvoiceRoute({ params }: EditInvoicePageProps) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Modifier la facture</h1>
      <InvoiceForm invoiceId={id} />
    </div>
  );
}
