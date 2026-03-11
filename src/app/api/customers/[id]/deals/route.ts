import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  name: z.string().min(1),
  stage: z.string().optional().nullable(),
  amount: z.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  closeDate: z.string().optional().nullable(),
  ownerName: z.string().optional().nullable(),
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
  const deal = await db.deal.create({
    data: {
      ...parsed.data,
      closeDate: parsed.data.closeDate ? new Date(parsed.data.closeDate) : null,
      customerId,
    },
  });
  return NextResponse.json(deal, { status: 201 });
}
