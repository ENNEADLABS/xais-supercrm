import crypto from "crypto";

// --- Chiffrement AES-256-GCM pour les credentials email ---

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/** Recupere la cle de chiffrement depuis les variables d'environnement */
function getKey(): Buffer {
  const key = process.env.EMAIL_ENCRYPTION_KEY;
  if (!key) throw new Error("EMAIL_ENCRYPTION_KEY is not set");
  return Buffer.from(key, "hex");
}

/** Chiffre une chaine en AES-256-GCM, retourne le resultat en base64 */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format : iv + encrypted + tag, encode en base64
  return Buffer.concat([iv, encrypted, tag]).toString("base64");
}

/** Dechiffre une chaine base64 chiffree en AES-256-GCM */
export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(buf.length - TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
