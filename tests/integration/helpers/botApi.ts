// Helpers partages des tests d'integration de l'API bot (specs 024/025).
// Le compte robot + la ligne api_keys sont seedes via le client admin plutot
// que via apiKeyService.generateApiKey, qui depend de
// createServerSupabaseClient() (cookies Next, indisponible hors requete HTTP).

import { randomBytes, createHash, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { getAdminClient, createClientWithBearerToken, getJwtSecret } from "./clients";

export interface SeededApiKey {
  rawKey: string;
  robotUserId: string;
}

export async function seedApiKey(orgId: string): Promise<SeededApiKey> {
  const admin = getAdminClient();

  const { data: robot, error: robotError } = await admin.auth.admin.createUser({
    email: `robot-${randomUUID()}@test.local`,
    password: randomBytes(32).toString("hex"),
    email_confirm: true,
    user_metadata: { full_name: "Robot Test" },
  });
  if (robotError || !robot.user) throw new Error(`createUser robot: ${robotError?.message}`);
  const robotUserId = robot.user.id;

  // handle_new_user cree une org jetable pour ce nouvel utilisateur ; on la
  // supprime pour garantir une membership unique (meme piege que setSoleMembership
  // dans factories.ts — get_user_org_id() fait un LIMIT 1 sans ORDER BY).
  const { data: junk } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", robotUserId);
  for (const row of junk ?? []) {
    await admin.from("organizations").delete().eq("id", row.organization_id);
  }

  const memberIns = await admin
    .from("organization_members")
    .insert({ organization_id: orgId, user_id: robotUserId, role: "member" });
  if (memberIns.error) throw new Error(`insert membership robot: ${memberIns.error.message}`);

  const rawKey = "sk_live_" + randomBytes(32).toString("base64url");
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyIns = await admin.from("api_keys").insert({
    organization_id: orgId,
    robot_user_id: robotUserId,
    label: "Test",
    key_prefix: rawKey.slice(0, 12),
    key_hash: keyHash,
    created_by: robotUserId, // valeur arbitraire valide (FK vers auth.users), non testee ici
  });
  if (keyIns.error) throw new Error(`insert api_keys: ${keyIns.error.message}`);

  return { rawKey, robotUserId };
}

/** Reproduit createRobotSupabaseClient (src/lib/utils/apiAuth.ts) sans passer
 * par Next — meme mecanisme (JWT signe avec le secret JWT legacy, HS256). */
export function createRobotClient(robotUserId: string) {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error(
      "Secret JWT legacy indisponible (stack locale sur signing keys asymetriques ?)",
    );
  }
  const token = jwt.sign({ role: "authenticated", sub: robotUserId }, secret, {
    expiresIn: "5m",
  });
  return createClientWithBearerToken(token);
}
