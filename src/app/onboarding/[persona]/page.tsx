import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/modules/auth/infrastructure/auth";
import { db } from "@/infrastructure/db/client";
import { invitation } from "@/infrastructure/db/schema";
import { isAuthPersona } from "@/modules/auth/domain/personas";
import { PersonaOnboardingClient } from "@/app/onboarding/[persona]/onboarding-client";

export default async function PersonaOnboardingPage({
  params,
}: {
  params: Promise<{ persona: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session == null) {
    redirect("/auth");
  }

  const { persona } = await params;
  if (!isAuthPersona(persona)) {
    notFound();
  }

  const pendingInvite =
    persona === "agent"
      ? await db.query.invitation.findFirst({
          where: and(
            eq(invitation.email, session.user.email),
            eq(invitation.status, "pending"),
          ),
          orderBy: desc(invitation.expiresAt),
        })
      : null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <PersonaOnboardingClient
          persona={persona}
          pendingInviteId={pendingInvite?.id ?? null}
          activeOrganizationId={session.session.activeOrganizationId ?? null}
        />
      </div>
    </main>
  );
}
