import { createServerSupabaseClient } from "@/lib/supabase/server";
import * as activityService from "./activityService";
import * as tenantConfigService from "./tenantConfigService";

// --- Conversion devis signe -> facture brouillon (via RPC transactionnelle) ---

export async function convertQuoteToInvoice(orgId: string, userId: string, quoteId: string) {
  const supabase = await createServerSupabaseClient();

  // Recuperer le delai de paiement depuis la config tenant
  const config = await tenantConfigService.getTenantConfig(orgId);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + config.payment_terms_days);

  // Appel RPC transactionnel (atomique : insert facture + copie lignes + update devis)
  const { data: invoiceId, error } = await supabase.rpc("convert_quote_to_invoice", {
    p_org_id: orgId,
    p_user_id: userId,
    p_quote_id: quoteId,
    p_due_date: dueDate.toISOString().split("T")[0],
  });

  if (error) throw error;
  if (!invoiceId) throw new Error("Conversion failed: no invoice ID returned");

  // Charger la facture creee pour la retourner
  const { data: invoices, error: fetchError } = await supabase
    .from("invoices")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", invoiceId);

  if (fetchError) throw fetchError;
  if (!invoices || invoices.length === 0) throw new Error("Facture creee introuvable");

  const invoice = invoices[0];

  // Logger l'activite sur les deux entites
  await activityService.log(orgId, {
    entityType: "quote",
    entityId: quoteId,
    action: "quote_invoiced",
    actorId: userId,
    metadata: { invoice_id: invoice.id },
  });

  await activityService.log(orgId, {
    entityType: "invoice",
    entityId: invoice.id as string,
    action: "created_from_quote",
    actorId: userId,
    metadata: { quote_id: quoteId },
  });

  return invoice;
}
