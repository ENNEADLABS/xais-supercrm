import { QuoteForm } from "@/components/quotes";

interface NewQuotePageProps {
  searchParams: Promise<{ dealId?: string; companyId?: string }>;
}

export default async function NewQuoteRoute({ searchParams }: NewQuotePageProps) {
  const { dealId, companyId } = await searchParams;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nouveau devis</h1>
      <QuoteForm dealId={dealId} companyId={companyId} />
    </div>
  );
}
