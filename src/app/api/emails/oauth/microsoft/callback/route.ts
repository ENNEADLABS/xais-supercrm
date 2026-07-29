import { NextResponse } from "next/server";

// Placeholder : callback OAuth Microsoft — sera implemente en V2

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
