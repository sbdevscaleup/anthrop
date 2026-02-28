"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { addPersonaToCurrentUser } from "@/app/(auth)/auth/actions/persona";
import { PERSONA_CONFIG, type AuthPersona } from "@/modules/auth/domain/personas";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function PersonaInterstitial({
  intendedRole,
  primaryRole,
  continueDestination,
}: {
  intendedRole: AuthPersona;
  primaryRole: AuthPersona;
  continueDestination: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAddPersona() {
    startTransition(async () => {
      const result = await addPersonaToCurrentUser(intendedRole);
      router.push(result.destination);
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center">
        <Card className="w-full rounded-[1.75rem] shadow-xl">
          <CardHeader className="space-y-3">
            <CardTitle className="text-3xl">
              This account is not set up as a {PERSONA_CONFIG[intendedRole].label.toLowerCase()} yet
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              You are signed in. Continue with your current {PERSONA_CONFIG[primaryRole].label.toLowerCase()} experience,
              or add the {PERSONA_CONFIG[intendedRole].label.toLowerCase()} persona to this same account.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              className="h-auto min-h-14 rounded-xl"
              onClick={() => router.push(continueDestination)}
            >
              Continue as {PERSONA_CONFIG[primaryRole].label}
            </Button>
            <Button
              className="h-auto min-h-14 rounded-xl"
              onClick={handleAddPersona}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Add {PERSONA_CONFIG[intendedRole].label} persona
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
