import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Language, ProjectStatus } from "@prisma/client";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  language: z.nativeEnum(Language).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  description: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    include: {
      customer: true,
      deal: true,
      documents: { orderBy: { createdAt: "desc" } },
      agentRuns: { orderBy: { startedAt: "desc" } },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const project = await db.project.update({ where: { id }, data: parsed.data });
  return NextResponse.json(project);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.project.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
