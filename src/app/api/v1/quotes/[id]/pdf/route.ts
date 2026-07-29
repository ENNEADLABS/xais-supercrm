import { NextResponse } from "next/server";
import { withBotAuth, jsonError, isUuid } from "@/lib/utils/botRoute";
import { generateQuotePdf } from "@/lib/services/pdfService";

/**
 * GET /api/v1/quotes/:id/pdf — PDF binaire du devis, meme rendu que la
 * route UI (/api/quotes/[id]/pdf) : filigrane BROUILLON si draft, mention
 * art. 293 B si l'organisation est en franchise de TVA.
 * 404 identique pour "inexistant" et "autre organisation" (pas d'oracle).
 */
export const GET = withBotAuth(async (_request, auth, ctx) => {
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError("NOT_FOUND", "Devis introuvable", 404);

  const { data: quotes, error } = await auth.supabase
    .from("quotes")
    .select("reference")
    .eq("organization_id", auth.context.organizationId)
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw error;
  if (!quotes || quotes.length === 0) {
    return jsonError("NOT_FOUND", "Devis introuvable", 404);
  }

  const buffer = await generateQuotePdf(auth.context.organizationId, id, auth.supabase);
  const filename = quotes[0].reference
    ? `${quotes[0].reference}.pdf`
    : `devis-brouillon-${id.slice(0, 8)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
