import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { browseCompanies } from "@/lib/hubspot";

export async function GET(req: NextRequest) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get("search") ?? undefined;

  try {
    const companies = await browseCompanies(search);
    return NextResponse.json(companies);
  } catch (error) {
    console.error("HubSpot browse error:", error);
    return NextResponse.json({ error: "Failed to fetch from HubSpot" }, { status: 500 });
  }
}
