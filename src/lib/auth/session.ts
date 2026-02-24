import { headers } from "next/headers";
import { auth } from "./auth";

export async function getSessionOrNull() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getRequiredSession() {
  const session = await getSessionOrNull();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

