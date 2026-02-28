"use client";

import { BetterAuthActionButton } from "@/modules/auth/ui/better-auth-action-button";
import { authClient } from "@/modules/auth/application/auth-client";

export function AccountDeletion() {
  return (
    <BetterAuthActionButton
      requireAreYouSure
      variant="destructive"
      className="w-full"
      successMessage="Account deletion initiated. Please check your email to confirm."
      action={() => authClient.deleteUser({ callbackURL: "/" })}
    >
      Delete Account Permanently
    </BetterAuthActionButton>
  );
}