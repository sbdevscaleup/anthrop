import { notFound } from "next/navigation";
import { AuthPersonaShell } from "@/app/(auth)/auth/_components/auth-persona-shell";
import { PersonaAuthView } from "@/app/(auth)/auth/_components/persona-auth-view";
import { isAuthPersona } from "@/modules/auth/domain/personas";

export default async function PersonaSignupPage({
  params,
}: {
  params: Promise<{ persona: string }>;
}) {
  const { persona } = await params;
  if (!isAuthPersona(persona)) {
    notFound();
  }

  return (
    <AuthPersonaShell persona={persona} mode="signup">
      <PersonaAuthView persona={persona} mode="signup" />
    </AuthPersonaShell>
  );
}
