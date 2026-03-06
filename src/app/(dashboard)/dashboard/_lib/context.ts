import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/modules/auth/infrastructure/auth";
import {
  loadDashboardContext,
  resolveDashboardHome,
} from "@/modules/dashboard/application/context";
import { db } from "@/infrastructure/db/client";
import { session as authSession } from "@/infrastructure/db/schema";

async function updateSessionPersona(
  session: Awaited<ReturnType<typeof auth.api.getSession>>,
  persona: "seller" | "agent",
) {
  if (!session) return;
  const currentPersona = (session.session as { activePersona?: string | null }).activePersona;
  if (currentPersona === persona) return;

  const sessionId = session.session.id;
  const sessionToken = session.session.token;
  if (!sessionId && !sessionToken) return;

  await db
    .update(authSession)
    .set({ activePersona: persona, updatedAt: new Date() })
    .where(
      sessionId
        ? eq(authSession.id, sessionId)
        : and(eq(authSession.userId, session.user.id), eq(authSession.token, sessionToken!)),
    );
}

export async function getDashboardRouteContext() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/auth");
  }

  const context = await loadDashboardContext({
    userId: session.user.id,
    activeOrganizationId: session.session.activeOrganizationId ?? null,
    sessionActivePersona:
      (session.session as { activePersona?: string | null }).activePersona ?? null,
  });

  return { session, context };
}

export async function redirectDashboardHome() {
  const { context } = await getDashboardRouteContext();
  const home = resolveDashboardHome(context);

  if (home === "seller") {
    redirect("/dashboard/seller");
  }
  if (home === "agent") {
    redirect("/dashboard/agent");
  }

  redirect("/");
}

export async function requireSellerDashboardContext() {
  const { session, context } = await getDashboardRouteContext();
  if (!context.canAccessSeller) {
    redirect("/auth/complete?role=seller");
  }

  await updateSessionPersona(session, "seller");
  return { session, context };
}

export async function requireAgentDashboardContext(options?: {
  requireOrganization?: boolean;
}) {
  const { session, context } = await getDashboardRouteContext();
  if (!context.canAccessAgent) {
    redirect("/auth/complete?role=agent");
  }

  if (options?.requireOrganization && !context.activeOrganizationId) {
    redirect("/onboarding/agent");
  }

  await updateSessionPersona(session, "agent");
  return { session, context };
}
