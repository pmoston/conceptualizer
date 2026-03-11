import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = form.get("password") as string;

  if (password !== process.env.AUTH_PASSWORD) {
    return NextResponse.redirect(new URL("/login?error=1", req.url));
  }

  const session = await getSession();
  session.authenticated = true;
  await session.save();

  return NextResponse.redirect(new URL("/", req.url));
}
