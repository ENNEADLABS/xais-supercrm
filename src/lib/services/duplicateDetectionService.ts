import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface DuplicateMatch {
  contact_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  confidence: number; // 0-100
  match_reasons: Array<"email" | "name" | "phone">;
}

/** Cherche les doublons potentiels d'un contact dans la meme org */
export async function findDuplicates(
  organizationId: string,
  input: {
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
  },
  excludeId?: string,
): Promise<DuplicateMatch[]> {
  const supabase = await createServerSupabaseClient();

  // Construire les conditions OR
  const conditions: string[] = [];

  // Match par nom+prenom (case insensitive)
  conditions.push(`and(first_name.ilike.${input.first_name},last_name.ilike.${input.last_name})`);

  // Match par email
  if (input.email) {
    conditions.push(`email.ilike.${input.email}`);
  }

  // Match par phone
  if (input.phone) {
    conditions.push(`phone.eq.${input.phone}`);
  }

  let query = supabase
    .from("contacts")
    .select("id, first_name, last_name, email, phone")
    .eq("organization_id", organizationId)
    .or(conditions.join(","))
    .eq("status", "active")
    .limit(10);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Scorer chaque match
  return (data ?? [])
    .map((contact) => {
      const reasons: Array<"email" | "name" | "phone"> = [];
      let confidence = 0;

      // Email match (highest priority)
      if (
        input.email &&
        contact.email &&
        input.email.toLowerCase() === contact.email.toLowerCase()
      ) {
        reasons.push("email");
        confidence = Math.max(confidence, 90);
      }

      // Nom + prenom match
      if (
        input.first_name.toLowerCase() === contact.first_name.toLowerCase() &&
        input.last_name.toLowerCase() === contact.last_name.toLowerCase()
      ) {
        reasons.push("name");
        confidence = Math.max(confidence, 85);
      }

      // Phone match
      if (input.phone && contact.phone && input.phone === contact.phone) {
        reasons.push("phone");
        confidence = Math.max(confidence, 70);
      }

      return {
        contact_id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        confidence,
        match_reasons: reasons,
      };
    })
    .filter((m) => m.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);
}
