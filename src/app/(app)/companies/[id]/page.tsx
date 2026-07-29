import { CompanyDetail } from "@/components/companies/CompanyDetail";

interface CompanyDetailRouteProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailRoute({ params }: CompanyDetailRouteProps) {
  const { id } = await params;
  return <CompanyDetail companyId={id} />;
}
