import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { unlink } from "fs/promises";
import path from "path";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { docId } = await params;

  const doc = await db.document.findUnique({ where: { id: docId } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await unlink(path.join(process.cwd(), doc.filePath));
  } catch {
    // File may already be missing — continue with DB deletion
  }

  await db.document.delete({ where: { id: docId } });
  return new NextResponse(null, { status: 204 });
}
