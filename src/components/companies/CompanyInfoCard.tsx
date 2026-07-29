import { Building2, ExternalLink, Phone, MapPin, Globe, Hash, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";

interface CompanyInfoCardProps {
  company: {
    domain?: string | null;
    phone?: string | null;
    website?: string | null;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    country?: string | null;
    size?: string | null;
    siren?: string | null;
    siret?: string | null;
    vat_number?: string | null;
    legal_form?: string | null;
    capital?: number | null;
    naf_code?: string | null;
  };
}

/** Carte d'infos d'une societe (coordonnees + informations legales). */
export function CompanyInfoCard({ company }: CompanyInfoCardProps) {
  const addressParts = [company.address, company.postal_code, company.city, company.country].filter(
    Boolean,
  );

  const hasLegalInfo =
    company.siren ||
    company.siret ||
    company.vat_number ||
    company.legal_form ||
    company.capital != null ||
    company.naf_code;

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {company.domain && <InfoRow icon={Globe} label="Domaine" value={company.domain} />}
          {company.phone && <InfoRow icon={Phone} label="Telephone" value={company.phone} />}
          {company.website && (
            <InfoRow
              icon={ExternalLink}
              label="Site web"
              value={
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {company.website}
                </a>
              }
            />
          )}
          {addressParts.length > 0 && (
            <InfoRow icon={MapPin} label="Adresse" value={addressParts.join(", ")} />
          )}
          {company.size && <InfoRow icon={Building2} label="Taille" value={company.size} />}
        </div>
      </Card>

      {hasLegalInfo && (
        <Card className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Informations légales
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {company.siren && <InfoRow icon={Hash} label="SIREN" value={company.siren} />}
            {company.siret && <InfoRow icon={Hash} label="SIRET" value={company.siret} />}
            {company.vat_number && (
              <InfoRow icon={Hash} label="N° TVA intracom" value={company.vat_number} />
            )}
            {company.legal_form && (
              <InfoRow icon={Building2} label="Forme juridique" value={company.legal_form} />
            )}
            {company.capital != null && (
              <InfoRow icon={Building2} label="Capital" value={formatCurrency(company.capital)} />
            )}
            {company.naf_code && (
              <InfoRow icon={Hash} label="Code NAF / APE" value={company.naf_code} />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

interface InfoRowProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}
