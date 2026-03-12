import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

function redirectTo(path: string, req: NextRequest) {
  const host  = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return NextResponse.redirect(new URL(path, `${proto}://${host}`));
}

export async function POST(req: NextRequest) {
  const form     = await req.formData();
  const email    = (form.get("email") as string | null)?.trim().toLowerCase() ?? "";
  const password = (form.get("password") as string | null) ?? "";

  if (!email || !password) return redirectTo("/login?error=1", req);

  // ── Bootstrap: if no users exist, create the first admin from env vars ──
  const userCount = await db.user.count();
  if (userCount === 0) {
    const adminEmail    = process.env.AUTH_EMAIL?.toLowerCase() ?? "";
    const adminPassword = process.env.AUTH_PASSWORD ?? "";
    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      const hash = await bcrypt.hash(adminPassword, 12);
      const admin = await db.user.create({
        data: { email: adminEmail, name: "Admin", passwordHash: hash, role: "ADMIN" },
      });
      const session = await getSession();
      session.authenticated = true;
      session.userId = admin.id;
      session.role   = "ADMIN";
      await session.save();
      return redirectTo("/", req);
    }
    return redirectTo("/login?error=1", req);
  }

  // ── Normal login ──
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return redirectTo("/login?error=1", req);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return redirectTo("/login?error=1", req);

  const session = await getSession();
  session.authenticated = true;
  session.userId = user.id;
  session.role   = user.role;
  await session.save();

  return redirectTo("/", req);
}
