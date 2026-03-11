import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { importCompanies } from "@/lib/hubspot";
import { z } from "zod";

const schema = z.object({
  hubspotIds: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const imported = await importCompanies(parsed.data.hubspotIds);
    return NextResponse.json({ imported });
  } catch (error) {
    console.error("HubSpot import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
