import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import {
  invitation,
  user,
  userProfile,
  userRole,
  userRoleAssignment,
  userRoles,
} from "@/infrastructure/db/schema";
import {
  type AuthPersona,
  getOnboardingPath,
  getPersonaDestination,
} from "@/modules/auth/domain/personas";

type PersonaMetadata = {
  onboardingCompletedRoles: AuthPersona[];
  lastIntendedRole: AuthPersona | null;
  [key: string]: unknown;
};

type PersonaState = {
  primaryRole: AuthPersona | null;
  roles: AuthPersona[];
  metadata: PersonaMetadata;
};

export type PostAuthResolution =
  | {
      kind: "redirect";
      persona: AuthPersona;
      destination: string;
    }
  | {
      kind: "interstitial";
      intendedRole: AuthPersona;
      primaryRole: AuthPersona;
      continueDestination: string;
    };

export class InvalidSessionUserError extends Error {
  constructor(userId: string) {
    super(`Session user does not exist: ${userId}`);
    this.name = "InvalidSessionUserError";
  }
}

function normalizeMetadata(raw: unknown): PersonaMetadata {
  const record =
    raw != null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const onboardingCompletedRoles = Array.isArray(record.onboardingCompletedRoles)
    ? record.onboardingCompletedRoles.filter(
        (value): value is AuthPersona =>
          value === "buyer" ||
          value === "seller" ||
          value === "renter" ||
          value === "agent",
      )
    : [];

  const lastIntendedRole =
    record.lastIntendedRole === "buyer" ||
    record.lastIntendedRole === "seller" ||
    record.lastIntendedRole === "renter" ||
    record.lastIntendedRole === "agent"
      ? record.lastIntendedRole
      : null;

  return {
    ...record,
    onboardingCompletedRoles,
    lastIntendedRole,
  };
}

async function getOrCreateMetadata(
  userId: string,
  updater?: (metadata: PersonaMetadata) => PersonaMetadata,
) {
  const profile = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, userId),
    orderBy: desc(userProfile.createdAt),
  });

  const current = normalizeMetadata(profile?.metadata);
  const next = updater ? updater(current) : current;

  if (profile) {
    await db
      .update(userProfile)
      .set({
        metadata: next,
        updatedAt: new Date(),
      })
      .where(eq(userProfile.id, profile.id));
    return next;
  }

  await db.insert(userProfile).values({
    userId,
    metadata: next,
  });
  return next;
}

export async function persistPersonaForUser(
  userId: string,
  role: AuthPersona,
  options?: { setPrimary?: boolean; intendedRole?: AuthPersona | null },
) {
  const setPrimary = options?.setPrimary ?? false;

  await db.transaction(async (tx) => {
    const existingPrimaryRole = await tx.query.userRole.findFirst({
      where: eq(userRole.userId, userId),
    });

    if (setPrimary) {
      if (existingPrimaryRole) {
        await tx
          .update(userRole)
          .set({ primaryRole: role })
          .where(eq(userRole.userId, userId));
      } else {
        await tx.insert(userRole).values({
          userId,
          primaryRole: role,
        });
      }

      await tx
        .update(userRoleAssignment)
        .set({ isPrimary: false })
        .where(and(eq(userRoleAssignment.userId, userId), isNull(userRoleAssignment.deletedAt)));
    } else {
      if (!existingPrimaryRole) {
        await tx.insert(userRole).values({
          userId,
          primaryRole: role,
        });
      }
    }

    const existingRole = await tx.query.userRoles.findFirst({
      where: and(eq(userRoles.userId, userId), eq(userRoles.role, role)),
    });

    if (!existingRole) {
      await tx.insert(userRoles).values({
        userId,
        role,
      });
    }

    const assignment = await tx.query.userRoleAssignment.findFirst({
      where: and(
        eq(userRoleAssignment.userId, userId),
        eq(userRoleAssignment.role, role),
        isNull(userRoleAssignment.deletedAt),
      ),
    });

    if (assignment) {
      if (setPrimary && assignment.isPrimary === false) {
        await tx
          .update(userRoleAssignment)
          .set({ isPrimary: true })
          .where(eq(userRoleAssignment.id, assignment.id));
      }
    } else {
      await tx.insert(userRoleAssignment).values({
        userId,
        role,
        isPrimary: setPrimary,
      });
    }
  });

  await getOrCreateMetadata(userId, (metadata) => ({
    ...metadata,
    lastIntendedRole: options?.intendedRole ?? metadata.lastIntendedRole,
  }));
}

export async function markPersonaOnboardingComplete(userId: string, role: AuthPersona) {
  await getOrCreateMetadata(userId, (metadata) => ({
    ...metadata,
    onboardingCompletedRoles: Array.from(
      new Set([...metadata.onboardingCompletedRoles, role]),
    ),
    lastIntendedRole: role,
  }));
}

export async function setLastIntendedRole(userId: string, role: AuthPersona | null) {
  await getOrCreateMetadata(userId, (metadata) => ({
    ...metadata,
    lastIntendedRole: role,
  }));
}

export async function getPersonaState(userId: string): Promise<PersonaState> {
  const [primary, roles, profile] = await Promise.all([
    db.query.userRole.findFirst({
      where: eq(userRole.userId, userId),
    }),
    db.query.userRoles.findMany({
      where: eq(userRoles.userId, userId),
    }),
    db.query.userProfile.findFirst({
      where: eq(userProfile.userId, userId),
      orderBy: desc(userProfile.createdAt),
    }),
  ]);

  const uniqueRoles = Array.from(new Set(roles.map((entry) => entry.role as AuthPersona)));

  return {
    primaryRole: (primary?.primaryRole as AuthPersona | undefined) ?? null,
    roles: uniqueRoles,
    metadata: normalizeMetadata(profile?.metadata),
  };
}

async function getPendingAgentInviteId(email: string) {
  const pendingInvite = await db.query.invitation.findFirst({
    where: and(eq(invitation.email, email), eq(invitation.status, "pending")),
    orderBy: desc(invitation.expiresAt),
  });

  return pendingInvite?.id ?? null;
}

async function ensurePersonaBaseline(userId: string, intendedRole: AuthPersona | null) {
  const existingUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { id: true },
  });

  if (!existingUser) {
    throw new InvalidSessionUserError(userId);
  }

  const state = await getPersonaState(userId);
  if (state.primaryRole) {
    return state;
  }

  const fallbackRole = intendedRole ?? "renter";
  await persistPersonaForUser(userId, fallbackRole, {
    setPrimary: true,
    intendedRole: fallbackRole,
  });

  return getPersonaState(userId);
}

function getResolvedDestination(
  persona: AuthPersona,
  options: {
    activeOrganizationId?: string | null;
    onboardingCompletedRoles: AuthPersona[];
    pendingAgentInviteId?: string | null;
  },
) {
  if (persona === "agent" && options.pendingAgentInviteId) {
    return `/dashboard/organizations/invites/${options.pendingAgentInviteId}`;
  }

  if (!options.onboardingCompletedRoles.includes(persona)) {
    return getOnboardingPath(persona);
  }

  return getPersonaDestination(persona, {
    activeOrganizationId: options.activeOrganizationId,
  });
}

export async function resolvePostAuthFlow(input: {
  userId: string;
  email: string;
  intendedRole: AuthPersona | null;
  activeOrganizationId?: string | null;
}) {
  let state = await ensurePersonaBaseline(input.userId, input.intendedRole);
  let resolvedPrimaryRole = state.primaryRole ?? "renter";

  if (!state.roles.includes(resolvedPrimaryRole)) {
    await persistPersonaForUser(input.userId, resolvedPrimaryRole, {
      setPrimary: true,
      intendedRole: input.intendedRole ?? resolvedPrimaryRole,
    });
    state = await getPersonaState(input.userId);
    resolvedPrimaryRole = state.primaryRole ?? "renter";
  }

  const intendedRole = input.intendedRole ?? resolvedPrimaryRole;
  const pendingAgentInviteId =
    intendedRole === "agent" ? await getPendingAgentInviteId(input.email) : null;

  await setLastIntendedRole(input.userId, intendedRole);

  if (state.roles.includes(intendedRole)) {
    return {
      kind: "redirect",
      persona: intendedRole,
      destination: getResolvedDestination(intendedRole, {
        activeOrganizationId: input.activeOrganizationId,
        onboardingCompletedRoles: state.metadata.onboardingCompletedRoles,
        pendingAgentInviteId,
      }),
    } satisfies PostAuthResolution;
  }

  const continueDestination = getResolvedDestination(resolvedPrimaryRole, {
    activeOrganizationId: input.activeOrganizationId,
    onboardingCompletedRoles: state.metadata.onboardingCompletedRoles,
    pendingAgentInviteId:
      resolvedPrimaryRole === "agent"
        ? await getPendingAgentInviteId(input.email)
        : null,
  });

  return {
    kind: "interstitial",
    intendedRole,
    primaryRole: resolvedPrimaryRole,
    continueDestination,
  } satisfies PostAuthResolution;
}
