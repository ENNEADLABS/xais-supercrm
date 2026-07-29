import { CompanyForm } from "@/components/companies/CompanyForm";

interface EditCompanyRouteProps {
  params: Promise<{ id: string }>;
}

export default async function EditCompanyRoute({ params }: EditCompanyRouteProps) {
  const { id } = await params;
  return <CompanyForm companyId={id} />;
}
