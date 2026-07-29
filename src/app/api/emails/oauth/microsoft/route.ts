import { NextResponse } from "next/server";

// Placeholder : l'integration Microsoft OAuth sera disponible en V2
// Endpoint reel : https://login.microsoftonline.com/common/oauth2/v2.0/authorize
// Scopes : Mail.Read, Mail.Send, User.Read, offline_access

export async function GET() {
  return NextResponse.json(
    {
      error: {
        code: "PROVIDER_NOT_AVAILABLE",
        message: "Microsoft 365 integration coming soon.",
      },
    },
    { status: 501 },
  );
}
