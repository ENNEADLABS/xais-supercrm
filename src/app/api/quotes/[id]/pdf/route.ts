import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateQuotePdf } from "@/lib/services/pdfService";

/**
 * GET /api/quotes/[id]/pdf — Genere et telecharge le PDF d'un devis.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Validation UUID
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "ID invalide" } },
      { status: 400 },
    );
  }

  // Verification de l'authentification
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Non authentifié" } },
      { status: 401 },
    );
  }

  // Recuperation de l'organisation
  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1);
  if (!member || member.length === 0) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Aucune organisation" } },
      { status: 403 },
    );
  }

  const orgId = member[0].organization_id;

  // Verification que le devis existe et appartient a l'organisation
  const { data: quote } = await supabase
    .from("quotes")
    .select("reference, status")
    .eq("id", id)
    .eq("organization_id", orgId);
  if (!quote || quote.length === 0) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Devis introuvable" } },
      { status: 404 },
    );
  }

  // Generation du PDF
  try {
    const buffer = await generateQuotePdf(orgId, id);
    const filename = quote[0].reference
      ? `${quote[0].reference}.pdf`
      : `devis-brouillon-${id.slice(0, 8)}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "PDF_ERROR", message: "Erreur génération PDF" } },
      { status: 500 },
    );
  }
}
