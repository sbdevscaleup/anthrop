"use server";

import { headers } from "next/headers";
import { auth } from "@/modules/auth/infrastructure/auth";
import {
  createPropertyForUser,
  type CreatePropertyInput,
} from "@/modules/properties/application/create-property";

async function getCurrentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

export async function createProperty(unsafeData: CreatePropertyInput) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, errors: { root: ["Not authenticated"] } };
  }

  return createPropertyForUser(userId, unsafeData);
}
