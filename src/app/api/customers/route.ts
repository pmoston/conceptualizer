import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customers = await db.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { contacts: true, projects: true, deals: true } },
    },
  });

  return NextResponse.json(customers);
}
