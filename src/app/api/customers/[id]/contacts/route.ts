import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  hubspotId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: customerId } = await params;
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const contact = await db.contact.create({ data: { ...parsed.data, customerId } });
  return NextResponse.json(contact, { status: 201 });
}
