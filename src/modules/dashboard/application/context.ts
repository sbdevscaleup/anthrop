import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import {
  userProfile,
  userRole,
  userRoleAssignment,
  userRoles,
} from "@/infrastructure/db/schema";
import type { DashboardPersona } from "@/modules/dashboard/contracts";

export type DashboardContext = {
  userId: string;
  activeOrganizationId: string | null;
  activePersona: DashboardPersona | null;
  roles: Set<string>;
  canAccessSeller: boolean;
  canAccessAgent: boolean;
};

function readLastIntendedRole(metadata: unknown): DashboardPersona | null {
  if (metadata == null || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>).lastIntendedRole;
  if (value === "seller" || value === "agent") {
    return value;
  }

  return null;
}

function resolvePersona(
  sessionActivePersona: string | null | undefined,
  lastIntendedRole: DashboardPersona | null,
  primaryRole: string | null,
): DashboardPersona | null {
  if (sessionActivePersona === "seller" || sessionActivePersona === "agent") {
    return sessionActivePersona;
  }

  if (lastIntendedRole) {
    return lastIntendedRole;
  }

  if (primaryRole === "seller" || primaryRole === "agent") {
    return primaryRole;
  }

  return null;
}

export async function loadDashboardContext(input: {
  userId: string;
  activeOrganizationId?: string | null;
  sessionActivePersona?: string | null;
}): Promise<DashboardContext> {
  const [primary, roles, assignments, profile] = await Promise.all([
    db.query.userRole.findFirst({
      where: eq(userRole.userId, input.userId),
    }),
    db.query.userRoles.findMany({
      where: eq(userRoles.userId, input.userId),
      columns: { role: true },
    }),
    db.query.userRoleAssignment.findMany({
      where: and(
        eq(userRoleAssignment.userId, input.userId),
        isNull(userRoleAssignment.deletedAt),
      ),
      columns: { role: true },
    }),
    db.query.userProfile.findFirst({
      where: eq(userProfile.userId, input.userId),
      orderBy: desc(userProfile.createdAt),
      columns: { metadata: true },
    }),
  ]);

  const roleSet = new Set<string>();
  if (primary?.primaryRole) {
    roleSet.add(primary.primaryRole);
  }
  for (const role of roles) {
    roleSet.add(role.role);
  }
  for (const assignment of assignments) {
    roleSet.add(assignment.role);
  }

  const lastIntendedRole = readLastIntendedRole(profile?.metadata);
  const activePersona = resolvePersona(
    input.sessionActivePersona,
    lastIntendedRole,
    primary?.primaryRole ?? null,
  );

  const canAccessSeller = roleSet.has("seller") || roleSet.has("admin");
  const canAccessAgent =
    roleSet.has("agent") || roleSet.has("agency_admin") || roleSet.has("admin");

  return {
    userId: input.userId,
    activeOrganizationId: input.activeOrganizationId ?? null,
    activePersona,
    roles: roleSet,
    canAccessSeller,
    canAccessAgent,
  };
}

export function resolveDashboardHome(context: DashboardContext): DashboardPersona | null {
  if (context.activePersona === "seller" && context.canAccessSeller) {
    return "seller";
  }
  if (context.activePersona === "agent" && context.canAccessAgent) {
    return "agent";
  }
  if (context.canAccessSeller) {
    return "seller";
  }
  if (context.canAccessAgent) {
    return "agent";
  }
  return null;
}
