"use server";

import { headers } from "next/headers";
import { auth } from "@/modules/auth/infrastructure/auth";
import {
  markPersonaOnboardingComplete,
  persistPersonaForUser,
} from "@/modules/auth/application/persona-state";
import {
  authPersonaSchema,
  getOnboardingPath,
  getPersonaDestination,
} from "@/modules/auth/domain/personas";

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session == null) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

export async function addPersonaToCurrentUser(role: string) {
  const parsedRole = authPersonaSchema.parse(role);
  const session = await requireSession();

  await persistPersonaForUser(session.user.id, parsedRole, {
    setPrimary: false,
    intendedRole: parsedRole,
  });

  return {
    destination: getOnboardingPath(parsedRole),
  };
}

export async function completePersonaOnboarding(role: string) {
  const parsedRole = authPersonaSchema.parse(role);
  const session = await requireSession();

  await markPersonaOnboardingComplete(session.user.id, parsedRole);

  return {
    destination: getPersonaDestination(parsedRole, {
      activeOrganizationId: session.session.activeOrganizationId ?? null,
    }),
  };
}
