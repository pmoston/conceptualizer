import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { syncCompanies, syncContacts, syncDeals } from "@/lib/hubspot";

export async function POST() {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const companies = await syncCompanies();
    const contacts = await syncContacts();
    const deals = await syncDeals();
    return NextResponse.json({ synced: { companies, contacts, deals } });
  } catch (error) {
    console.error("HubSpot sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
