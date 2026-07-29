import { z } from "zod";

import type { CsvEntityType, CsvFieldDef, CsvRowValidation } from "@/types/csv";

// --- Definitions des champs par entite (label FR, aliases pour auto-mapping) ---

export const CONTACT_FIELDS: CsvFieldDef[] = [
  {
    key: "first_name",
    label: "Prenom",
    aliases: ["prenom", "prénom", "first_name", "firstname", "first name"],
    required: true,
  },
  {
    key: "last_name",
    label: "Nom",
    aliases: ["nom", "last_name", "lastname", "last name", "nom de famille"],
    required: true,
  },
  {
    key: "email",
    label: "Email",
    aliases: ["email", "e-mail", "mail", "adresse email", "courriel"],
  },
  {
    key: "phone",
    label: "Telephone",
    aliases: ["telephone", "téléphone", "tel", "tél", "phone", "mobile"],
  },
  {
    key: "job_title",
    label: "Poste",
    aliases: ["poste", "titre", "fonction", "job_title", "job title", "title", "position"],
  },
  {
    key: "status",
    label: "Statut",
    aliases: ["statut", "status", "etat", "état"],
  },
];

export const COMPANY_FIELDS: CsvFieldDef[] = [
  {
    key: "name",
    label: "Nom",
    aliases: ["nom", "name", "raison sociale", "societe", "société", "entreprise", "company"],
    required: true,
  },
  {
    key: "domain",
    label: "Domaine",
    aliases: ["domaine", "domain", "nom de domaine"],
  },
  {
    key: "industry",
    label: "Secteur",
    aliases: ["secteur", "industry", "activite", "activité", "secteur d'activite"],
  },
  {
    key: "size",
    label: "Taille",
    aliases: ["taille", "size", "effectif", "nombre employes"],
  },
  {
    key: "address",
    label: "Adresse",
    aliases: ["adresse", "address", "rue"],
  },
  {
    key: "city",
    label: "Ville",
    aliases: ["ville", "city"],
  },
  {
    key: "postal_code",
    label: "Code postal",
    aliases: ["code postal", "postal_code", "zip", "zipcode", "cp"],
  },
  {
    key: "country",
    label: "Pays",
    aliases: ["pays", "country"],
  },
  {
    key: "phone",
    label: "Telephone",
    aliases: ["telephone", "téléphone", "tel", "tél", "phone"],
  },
  {
    key: "website",
    label: "Site web",
    aliases: ["site web", "website", "site", "url", "web"],
  },
  {
    key: "status",
    label: "Statut",
    aliases: ["statut", "status", "etat", "état"],
  },
];

export const DEAL_FIELDS: CsvFieldDef[] = [
  {
    key: "name",
    label: "Nom",
    aliases: ["nom", "name", "opportunite", "opportunité", "deal"],
    required: true,
  },
  {
    key: "company_name",
    label: "Societe",
    aliases: ["societe", "société", "company", "company_name", "entreprise", "raison sociale"],
    required: true,
  },
  {
    key: "stage",
    label: "Etape",
    aliases: ["etape", "étape", "stage", "phase"],
  },
  {
    key: "amount",
    label: "Montant (centimes)",
    aliases: ["montant", "amount", "montant ht", "prix", "valeur"],
  },
  {
    key: "probability",
    label: "Probabilite (%)",
    aliases: ["probabilite", "probabilité", "probability", "proba", "%"],
  },
  {
    key: "expected_close_date",
    label: "Date cloture",
    aliases: [
      "date cloture",
      "date clôture",
      "expected_close_date",
      "close date",
      "date de cloture",
      "echeance",
      "échéance",
    ],
  },
];

/** Retourne les definitions de champs pour un type d'entite */
export function getFieldDefs(entityType: CsvEntityType): CsvFieldDef[] {
  switch (entityType) {
    case "contact":
      return CONTACT_FIELDS;
    case "company":
      return COMPANY_FIELDS;
    case "deal":
      return DEAL_FIELDS;
  }
}

/** Normalise un header pour la comparaison (lowercase, sans accents, trim) */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Auto-mapping : essaie de mapper les headers CSV vers les champs DB */
export function autoMapColumns(
  csvHeaders: string[],
  entityType: CsvEntityType,
): Array<{ csvHeader: string; dbField: string | null }> {
  const fields = getFieldDefs(entityType);

  return csvHeaders.map((header) => {
    const normalized = normalizeHeader(header);

    for (const field of fields) {
      // Match exact sur le key DB
      if (normalized === field.key) {
        return { csvHeader: header, dbField: field.key };
      }
      // Match sur les aliases normalises
      for (const alias of field.aliases) {
        if (normalized === normalizeHeader(alias)) {
          return { csvHeader: header, dbField: field.key };
        }
      }
    }

    return { csvHeader: header, dbField: null };
  });
}

// --- Schemas Zod pour validation a l'import (plus souples que les schemas de creation) ---

export const csvContactSchema = z.object({
  first_name: z.string().min(1, "Le prenom est requis").max(100),
  last_name: z.string().min(1, "Le nom est requis").max(100),
  email: z
    .string()
    .email("Email invalide")
    .transform((v) => v.toLowerCase())
    .nullish()
    .or(z.literal("")),
  phone: z.string().max(50).nullish().or(z.literal("")),
  job_title: z.string().max(150).nullish().or(z.literal("")),
  status: z.enum(["active", "archived"]).default("active"),
});

export const csvCompanySchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200),
  domain: z.string().max(253).nullish().or(z.literal("")),
  industry: z.string().max(100).nullish().or(z.literal("")),
  size: z.string().max(50).nullish().or(z.literal("")),
  address: z.string().max(300).nullish().or(z.literal("")),
  city: z.string().max(100).nullish().or(z.literal("")),
  postal_code: z.string().max(20).nullish().or(z.literal("")),
  country: z.string().max(100).nullish().or(z.literal("")),
  phone: z.string().max(50).nullish().or(z.literal("")),
  website: z.string().url("URL invalide").nullish().or(z.literal("")),
  status: z.enum(["active", "archived"]).default("active"),
});

export const csvDealSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200),
  company_name: z.string().min(1, "La société est requise"),
  stage: z.string().default("new"),
  amount: z
    .string()
    .transform((v) => {
      if (!v || v.trim() === "") return null;
      const n = parseInt(v, 10);
      return isNaN(n) ? null : n;
    })
    .nullish(),
  probability: z
    .string()
    .transform((v) => {
      if (!v || v.trim() === "") return null;
      const n = parseInt(v, 10);
      return isNaN(n) ? null : Math.min(100, Math.max(0, n));
    })
    .nullish(),
  expected_close_date: z.string().nullish().or(z.literal("")),
});

/** Retourne le schema Zod pour un type d'entite */
export function getImportSchema(entityType: CsvEntityType) {
  switch (entityType) {
    case "contact":
      return csvContactSchema;
    case "company":
      return csvCompanySchema;
    case "deal":
      return csvDealSchema;
  }
}

// --- Validation import (client-safe, pas de dependance serveur) ---

/** Transforme une ligne CSV brute en objet selon le mapping */
function mapRow(
  row: string[],
  headers: string[],
  mapping: Array<{ csvHeader: string; dbField: string }>,
): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const m of mapping) {
    const idx = headers.indexOf(m.csvHeader);
    if (idx !== -1 && idx < row.length) {
      obj[m.dbField] = row[idx].trim();
    }
  }
  return obj;
}

/** Valide les lignes importees contre le schema Zod */
export function validateImportRows(
  entityType: CsvEntityType,
  rows: string[][],
  headers: string[],
  mapping: Array<{ csvHeader: string; dbField: string }>,
): CsvRowValidation[] {
  const schema = getImportSchema(entityType);

  return rows.map((row, i) => {
    const mapped = mapRow(row, headers, mapping);

    // Convertir les chaines vides en null pour les champs optionnels
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(mapped)) {
      cleaned[key] = value === "" ? null : value;
    }

    const result = schema.safeParse(cleaned);

    if (result.success) {
      return {
        row: i + 2, // +2 car header = ligne 1, index 0 = ligne 2
        valid: true,
        errors: [],
        data: result.data as Record<string, unknown>,
      };
    }

    return {
      row: i + 2,
      valid: false,
      errors: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  });
}
