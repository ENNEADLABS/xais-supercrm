import { DealForm } from "@/components/deals";

export default function NewDealRoute() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nouveau deal</h1>
      <DealForm />
    </div>
  );
}
