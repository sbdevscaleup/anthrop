import { GoogleIcon } from "@/modules/auth/ui/o-auth-icons";
import { ComponentProps, ElementType } from "react";

export const SUPPORTED_OAUTH_PROVIDERS = ["google"] as const;
export type SupportedOAuthProvider = (typeof SUPPORTED_OAUTH_PROVIDERS)[number];

export const SUPPORTED_OAUTH_PROVIDER_DETAILS: Record<
  SupportedOAuthProvider,
  { name: string; Icon: ElementType<ComponentProps<"svg">> }
> = {
  google: { name: "Google", Icon: GoogleIcon },
};
