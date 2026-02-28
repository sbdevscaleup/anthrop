"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/modules/auth/application/auth-client";

export function InvalidSessionReset() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function reset() {
      try {
        await authClient.signOut();
      } catch {
        // Ignore sign-out errors and still force the user back to auth.
      }

      if (!cancelled) {
        router.replace("/auth");
        router.refresh();
      }
    }

    void reset();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center">
        <div className="rounded-3xl border bg-background p-8 text-center shadow-xl">
          <h1 className="text-2xl font-semibold tracking-tight">Resetting session</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your current session does not match an active user record. Signing you out and returning to auth.
          </p>
        </div>
      </div>
    </main>
  );
}
