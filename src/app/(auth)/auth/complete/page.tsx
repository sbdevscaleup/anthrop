import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/modules/auth/infrastructure/auth";
import { InvalidSessionReset } from "@/app/(auth)/auth/_components/invalid-session-reset";
import { PersonaInterstitial } from "@/app/(auth)/auth/_components/persona-interstitial";
import {
  InvalidSessionUserError,
  resolvePostAuthFlow,
} from "@/modules/auth/application/persona-state";
import { authPersonaSchema } from "@/modules/auth/domain/personas";

export default async function AuthCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session == null) {
    redirect("/auth");
  }

  const { role } = await searchParams;
  const intendedRole = role ? authPersonaSchema.safeParse(role).data ?? null : null;
  try {
    const resolution = await resolvePostAuthFlow({
      userId: session.user.id,
      email: session.user.email,
      intendedRole,
      activeOrganizationId: session.session.activeOrganizationId ?? null,
    });

    if (resolution.kind === "redirect") {
      redirect(resolution.destination);
    }

    return (
      <PersonaInterstitial
        intendedRole={resolution.intendedRole}
        primaryRole={resolution.primaryRole}
        continueDestination={resolution.continueDestination}
      />
    );
  } catch (error) {
    if (error instanceof InvalidSessionUserError) {
      return <InvalidSessionReset />;
    }

    throw error;
  }
}
