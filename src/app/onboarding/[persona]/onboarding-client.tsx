"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/modules/auth/application/auth-client";
import { completePersonaOnboarding } from "@/app/(auth)/auth/actions/persona";
import {
  PERSONA_CONFIG,
  type AuthPersona,
} from "@/modules/auth/domain/personas";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { toast } from "sonner";

export function PersonaOnboardingClient({
  persona,
  pendingInviteId,
  activeOrganizationId,
}: {
  persona: AuthPersona;
  pendingInviteId?: string | null;
  activeOrganizationId?: string | null;
}) {
  if (persona === "agent") {
    return (
      <AgentOnboardingClient
        pendingInviteId={pendingInviteId}
        activeOrganizationId={activeOrganizationId}
      />
    );
  }

  const config = PERSONA_CONFIG[persona];
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleContinue() {
    startTransition(async () => {
      const result = await completePersonaOnboarding(persona);
      router.push(result.destination);
      router.refresh();
    });
  }

  return (
    <Card className="w-full rounded-[1.75rem] shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl">
          Finish your {config.label.toLowerCase()} setup
        </CardTitle>
        <CardDescription>{config.signupDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3">
          {config.signupBenefits.map((benefit) => (
            <div key={benefit} className="rounded-2xl border bg-muted/40 p-4 text-sm">
              {benefit}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="rounded-xl" onClick={handleContinue} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Continue
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={handleContinue}
            disabled={isPending}
          >
            Skip for now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentOnboardingClient({
  pendingInviteId,
  activeOrganizationId,
}: {
  pendingInviteId?: string | null;
  activeOrganizationId?: string | null;
}) {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [isCompleting, startCompleting] = useTransition();
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  async function markCompleteAndGo() {
    const result = await completePersonaOnboarding("agent");
    router.push(result.destination);
    router.refresh();
  }

  function handleSoloContinue() {
    startCompleting(async () => {
      const result = await completePersonaOnboarding("agent");
      router.push(result.destination);
      router.refresh();
    });
  }

  async function handleCreateOrganization() {
    const trimmedName = organizationName.trim();
    if (!trimmedName) {
      toast.error("Organization name is required");
      return;
    }

    setIsCreatingOrg(true);

    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const res = await authClient.organization.create({
      name: trimmedName,
      slug,
    });

    if (res.error) {
      toast.error(res.error.message || "Failed to create organization");
      setIsCreatingOrg(false);
      return;
    }

    await authClient.organization.setActive({ organizationId: res.data.id });
    await markCompleteAndGo();
    setIsCreatingOrg(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="rounded-[1.75rem] shadow-xl">
        <CardHeader>
          <CardTitle>Create organization</CardTitle>
          <CardDescription>
            Start your own team space and move directly into organization management.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            placeholder="Organization name"
          />
          <Button
            className="w-full rounded-xl"
            onClick={handleCreateOrganization}
            disabled={isCreatingOrg}
          >
            {isCreatingOrg ? <Loader2 className="size-4 animate-spin" /> : null}
            Create organization
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem] shadow-xl">
        <CardHeader>
          <CardTitle>Join via invite</CardTitle>
          <CardDescription>
            Accept an invitation if another organization has already invited you in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full rounded-xl">
            <Link
              href={
                pendingInviteId
                  ? `/dashboard/organizations/invites/${pendingInviteId}`
                  : "/dashboard/organizations"
              }
            >
              {pendingInviteId ? "Review invitation" : "Open organizations"}
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            {pendingInviteId
              ? "A pending invitation was found for your account."
              : "No pending invite was found. You can still manage organizations later."}
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem] shadow-xl">
        <CardHeader>
          <CardTitle>Continue solo</CardTitle>
          <CardDescription>
            Finish setup without an active organization and enter the dashboard now.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={handleSoloContinue}
            disabled={isCompleting}
          >
            {isCompleting ? <Loader2 className="size-4 animate-spin" /> : null}
            Continue solo for now
          </Button>
          <p className="text-sm text-muted-foreground">
            {activeOrganizationId
              ? "You already have an active organization and can continue into it."
              : "You can create or join an organization later from the dashboard."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
