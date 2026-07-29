import { QuoteForm } from "@/components/quotes";

interface EditQuotePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditQuoteRoute({ params }: EditQuotePageProps) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Modifier le devis</h1>
      <QuoteForm quoteId={id} />
    </div>
  );
}
