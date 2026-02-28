import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  PERSONA_CONFIG,
  type AuthPersona,
  getAuthLoginPath,
  getAuthSignupPath,
} from "@/modules/auth/domain/personas";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function PersonaChooserCard({ persona }: { persona: AuthPersona }) {
  const config = PERSONA_CONFIG[persona];

  return (
    <Card className="flex h-full flex-col rounded-[1.75rem] border border-border/60 bg-white/85 shadow-lg backdrop-blur">
      <CardHeader className="space-y-4">
        <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
          {config.shortLabel}
        </div>
        <CardTitle className="text-2xl">{config.label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-6">
        <p className="text-sm leading-6 text-muted-foreground">
          {config.signupDescription}
        </p>

        <div className="space-y-3">
          <Button asChild className="w-full justify-between rounded-xl">
            <Link href={getAuthSignupPath(persona)}>
              Create account
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full rounded-xl">
            <Link href={getAuthLoginPath(persona)}>Log in</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
