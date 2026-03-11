import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";
import { generatePreview } from "@/lib/converter";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { docId } = await params;
  const doc = await db.document.findUnique({ where: { id: docId } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!doc.previewPath) return NextResponse.json({ error: "No preview available" }, { status: 404 });

  const buffer = await readFile(path.join(process.cwd(), doc.previewPath));
  return new NextResponse(buffer, {
    headers: { "Content-Type": "image/png" },
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { docId } = await params;
  const doc = await db.document.findUnique({ where: { id: docId } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const preview = await generatePreview(doc.filePath, doc.mimeType);

  if (preview === null) {
    return NextResponse.json({ error: "Converter is not configured." }, { status: 503 });
  }

  const updated = await db.document.update({
    where: { id: docId },
    data: {
      previewPath: preview.previewPath,
      previewError: preview.error,
      ocrText: preview.ocrText,
    },
  });

  return NextResponse.json(updated);
}
