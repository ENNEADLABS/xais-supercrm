import { InvoiceForm } from "@/components/invoices";

export default function NewInvoiceRoute() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nouvelle facture</h1>
      <InvoiceForm />
    </div>
  );
}
