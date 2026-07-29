import { DealForm } from "@/components/deals";

interface EditDealPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDealRoute({ params }: EditDealPageProps) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Modifier le deal</h1>
      <DealForm dealId={id} />
    </div>
  );
}
