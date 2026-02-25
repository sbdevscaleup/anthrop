"use client";

import { BetterAuthActionButton } from "@/modules/auth/ui/better-auth-action-button";
import { authClient } from "@/modules/auth/application/auth-client";
import {
  SUPPORTED_OAUTH_PROVIDER_DETAILS,
  SUPPORTED_OAUTH_PROVIDERS,
} from "@/modules/auth/ui/o-auth-providers";

export function SocialAuthButtons() {
  return SUPPORTED_OAUTH_PROVIDERS.map((provider) => {
    const Icon = SUPPORTED_OAUTH_PROVIDER_DETAILS[provider].Icon;

    return (
      <BetterAuthActionButton
        variant="outline"
        key={provider}
        action={() => {
          return authClient.signIn.social({
            provider,
            callbackURL: "/",
          });
        }}
      >
        <Icon />
        {SUPPORTED_OAUTH_PROVIDER_DETAILS[provider].name}
      </BetterAuthActionButton>
    );
  });
}