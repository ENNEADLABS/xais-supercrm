"use client";

import { Building2, Unlink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUnlinkContactCompany } from "@/lib/hooks/useContacts";
import type { Company } from "@/types/database";

export interface ContactCompanyRow {
  id: string;
  company_id: string;
  role: string | null;
  is_primary: boolean;
  companies: Company;
}

interface ContactCompaniesTabProps {
  contactId: string;
  companies: ContactCompanyRow[];
}

/**
 * Onglet Sociétés : liste des sociétés liées au contact.
 */
export function ContactCompaniesTab({ contactId, companies }: ContactCompaniesTabProps) {
  const unlinkMutation = useUnlinkContactCompany();

  if (companies.length === 0) {
    return (
      <div className="py-8 text-center">
        <Building2 className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Aucune société liée à ce contact.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {companies.map((link) => {
        const company = link.companies;
        return (
          <Card key={link.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <Building2 className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{company.name}</p>
                {link.role && <p className="text-xs text-muted-foreground">{link.role}</p>}
                {link.is_primary && <span className="text-xs text-emerald-600">Principale</span>}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                unlinkMutation.mutate({
                  contactId,
                  companyId: company.id,
                })
              }
              disabled={unlinkMutation.isPending}
              aria-label={`Délier ${company.name}`}
            >
              <Unlink className="size-4" />
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
