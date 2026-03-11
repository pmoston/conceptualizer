import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Language } from "@prisma/client";

const createSchema = z.object({
  title: z.string().min(1),
  language: z.nativeEnum(Language),
  customerId: z.string().min(1),
  dealId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export async function GET() {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true } },
      deal: { select: { id: true, name: true } },
      _count: { select: { documents: true, agentRuns: true } },
    },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const project = await db.project.create({ data: parsed.data });
  return NextResponse.json(project, { status: 201 });
}
