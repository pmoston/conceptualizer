import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  authenticated: boolean;
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
