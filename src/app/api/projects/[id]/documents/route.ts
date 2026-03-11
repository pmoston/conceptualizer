import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DocumentType } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const type = (form.get("type") as DocumentType) ?? DocumentType.SOURCE_MATERIAL;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF, DOCX and TXT files are allowed" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "uploads", projectId);
  await mkdir(uploadDir, { recursive: true });

  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = path.join(uploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const document = await db.document.create({
    data: {
      name: file.name,
      type,
      filePath: path.join("uploads", projectId, fileName),
      mimeType: file.type,
      sizeBytes: file.size,
      projectId,
    },
  });

  return NextResponse.json(document, { status: 201 });
}
