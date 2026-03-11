import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  stage: z.string().optional().nullable(),
  amount: z.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  closeDate: z.string().optional().nullable(),
  ownerName: z.string().optional().nullable(),
  hubspotId: z.string().optional().nullable(),
});

type Params = { params: Promise<{ id: string; dealId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { dealId } = await params;
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const deal = await db.deal.update({
    where: { id: dealId },
    data: {
      ...parsed.data,
      closeDate: parsed.data.closeDate !== undefined
        ? (parsed.data.closeDate ? new Date(parsed.data.closeDate) : null)
        : undefined,
    },
  });
  return NextResponse.json(deal);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { dealId } = await params;
  await db.deal.delete({ where: { id: dealId } });
  return new NextResponse(null, { status: 204 });
}
