"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";

export function PersonaSwitcher({
  activePersona,
  canAccessSeller,
  canAccessAgent,
}: {
  activePersona: "seller" | "agent" | null;
  canAccessSeller: boolean;
  canAccessAgent: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchPersona(persona: "seller" | "agent") {
    startTransition(async () => {
      await fetch("/api/dashboard/context/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona }),
      });

      if (persona === "seller") {
        router.push("/dashboard/seller");
      } else {
        router.push("/dashboard/agent");
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {canAccessSeller ? (
        <Button
          size="sm"
          variant={activePersona === "seller" || pathname.startsWith("/dashboard/seller") ? "default" : "outline"}
          onClick={() => switchPersona("seller")}
          disabled={isPending}
        >
          Seller
        </Button>
      ) : null}
      {canAccessAgent ? (
        <Button
          size="sm"
          variant={activePersona === "agent" || pathname.startsWith("/dashboard/agent") ? "default" : "outline"}
          onClick={() => switchPersona("agent")}
          disabled={isPending}
        >
          Agent
        </Button>
      ) : null}
    </div>
  );
}
