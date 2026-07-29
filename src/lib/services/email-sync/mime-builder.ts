// Construction de messages MIME RFC 2822 pour l'envoi via Gmail API

interface MimeOptions {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_text?: string;
  body_html?: string;
  in_reply_to?: string;
  references?: string;
}

/** Construit un message MIME complet (text/plain ou multipart/alternative) */
export function buildMimeMessage(options: MimeOptions): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const lines: string[] = [];

  // En-tetes RFC 2822
  lines.push(`From: ${options.from}`);
  lines.push(`To: ${options.to.join(", ")}`);
  if (options.cc?.length) lines.push(`Cc: ${options.cc.join(", ")}`);
  if (options.bcc?.length) lines.push(`Bcc: ${options.bcc.join(", ")}`);
  lines.push(`Subject: =?UTF-8?B?${Buffer.from(options.subject).toString("base64")}?=`);
  lines.push("MIME-Version: 1.0");

  if (options.in_reply_to) lines.push(`In-Reply-To: ${options.in_reply_to}`);
  if (options.references) lines.push(`References: ${options.references}`);

  // Corps : multipart/alternative si HTML, sinon text/plain
  if (options.body_html) {
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: base64");
    lines.push("");
    lines.push(Buffer.from(options.body_text ?? "").toString("base64"));
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/html; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: base64");
    lines.push("");
    lines.push(Buffer.from(options.body_html).toString("base64"));
    lines.push(`--${boundary}--`);
  } else {
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: base64");
    lines.push("");
    lines.push(Buffer.from(options.body_text ?? "").toString("base64"));
  }

  return lines.join("\r\n");
}

/** Encode une chaine en base64url (format attendu par Gmail API) */
export function encodeBase64Url(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
