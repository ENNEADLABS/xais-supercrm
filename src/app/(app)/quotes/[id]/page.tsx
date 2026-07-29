import { QuoteDetail } from "@/components/quotes";

interface QuotePageProps {
  params: Promise<{ id: string }>;
}

export default async function QuoteRoute({ params }: QuotePageProps) {
  const { id } = await params;
  return <QuoteDetail quoteId={id} />;
}
