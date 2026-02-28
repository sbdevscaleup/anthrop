"use client";

import { BetterAuthActionButton } from "@/modules/auth/ui/better-auth-action-button";
import { authClient } from "@/modules/auth/application/auth-client";

export function SetPasswordButton({ email }: { email: string }) {
  return (
    <BetterAuthActionButton
      variant="outline"
      successMessage="Password reset email sent"
      action={() => {
        return authClient.requestPasswordReset({
          email,
          redirectTo: "/auth/reset-password",
        });
      }}
    >
      Send Password Reset Email
    </BetterAuthActionButton>
  );
}