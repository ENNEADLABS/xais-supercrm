import { DealDetail } from "@/components/deals";

interface DealPageProps {
  params: Promise<{ id: string }>;
}

export default async function DealRoute({ params }: DealPageProps) {
  const { id } = await params;
  return <DealDetail dealId={id} />;
}
