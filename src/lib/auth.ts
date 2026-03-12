import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";

export interface SessionData {
  authenticated: boolean;
  userId?: string;
  role?: UserRole;
}

const sessionOptions = {
  password: process.env.AUTH_SECRET!,
  cookieName: "conceptualizer-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.authenticated) {
    throw new Error("Unauthorized");
  }
  return session;
}

const ROLE_HIERARCHY: UserRole[] = ["VIEWER", "CONSULTANT", "ADMIN"];

/** Throws if the session user's role is below minRole. */
export async function requireRole(minRole: UserRole) {
  const session = await getSession();
  if (!session.authenticated) throw new Error("Unauthorized");
  const userLevel = ROLE_HIERARCHY.indexOf(session.role ?? "VIEWER");
  const minLevel  = ROLE_HIERARCHY.indexOf(minRole);
  if (userLevel < minLevel) throw new Error("Forbidden");
  return session;
}
