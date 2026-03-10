import { NextResponse } from "next/server";

export async function GET() {
  const namecheapConfigured = !!(
    process.env.NAMECHEAP_API_USER &&
    process.env.NAMECHEAP_API_KEY &&
    process.env.NAMECHEAP_USERNAME &&
    process.env.NAMECHEAP_CLIENT_IP
  );

  return NextResponse.json({ namecheapConfigured });
}
