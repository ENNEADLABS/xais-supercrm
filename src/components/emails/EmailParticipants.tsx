import Link from "next/link";
import type { EmailParticipant } from "@/types/email";

interface EmailParticipantsProps {
  participants: EmailParticipant[];
  role: "from" | "to" | "cc";
  label: string;
}

/** Affiche les participants d'un email avec liens vers les contacts resolus */
export function EmailParticipants({ participants, role, label }: EmailParticipantsProps) {
  const filtered = participants.filter((p) => p.role === role);
  if (filtered.length === 0) return null;

  return (
    <div className="flex gap-1 text-sm">
      <span className="shrink-0 text-muted-foreground">{label} :</span>
      <div className="flex flex-wrap gap-1">
        {filtered.map((p) => (
          <span key={p.id}>
            {p.contact_id ? (
              <Link href={`/contacts/${p.contact_id}`} className="text-blue-600 hover:underline">
                {p.display_name || p.email_address}
              </Link>
            ) : (
              <span>{p.display_name || p.email_address}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
