import { getRequiredWebSession } from "@/app/api/_shared/session";
import { loadDashboardContext } from "@/modules/dashboard/application/context";

export async function getDashboardContext() {
  const session = await getRequiredWebSession();
  const context = await loadDashboardContext({
    userId: session.user.id,
    activeOrganizationId: session.session.activeOrganizationId ?? null,
    sessionActivePersona:
      (session.session as { activePersona?: string | null }).activePersona ?? null,
  });

  return { session, context };
}

export async function requireSellerApiAccess() {
  const payload = await getDashboardContext();
  if (!payload.context.canAccessSeller) {
    throw new Error("FORBIDDEN");
  }
  return payload;
}

export async function requireAgentApiAccess() {
  const payload = await getDashboardContext();
  if (!payload.context.canAccessAgent) {
    throw new Error("FORBIDDEN");
  }
  return payload;
}
