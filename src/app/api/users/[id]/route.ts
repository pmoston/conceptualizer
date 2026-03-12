import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { UserRole } from "@prisma/client";

const updateSchema = z.object({
  name:     z.string().min(1).optional(),
  role:     z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try { await requireRole("ADMIN"); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id }  = await params;
  const body    = await req.json();
  const parsed  = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { password, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (password) data.passwordHash = await bcrypt.hash(password, 12);

  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await (async () => {
    try { return await requireRole("ADMIN"); } catch { return null; }
  })();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Prevent deleting yourself
  if (id === session.userId) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 409 });
  }
  await db.user.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
