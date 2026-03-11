import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

function redirectTo(path: string, req: NextRequest) {
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return NextResponse.redirect(new URL(path, `${proto}://${host}`));
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = form.get("password") as string;

  if (password !== process.env.AUTH_PASSWORD) {
    return redirectTo("/login?error=1", req);
  }

  const session = await getSession();
  session.authenticated = true;
  await session.save();

  return redirectTo("/", req);
}
