import { z } from "zod";

export const AUTH_PERSONAS = ["renter", "buyer", "seller", "agent"] as const;

export const authPersonaSchema = z.enum(AUTH_PERSONAS);

export type AuthPersona = z.infer<typeof authPersonaSchema>;
export type PersistedUserRole =
  | AuthPersona
  | "agency_admin"
  | "admin";

type PersonaConfig = {
  label: string;
  shortLabel: string;
  loginTitle: string;
  loginDescription: string;
  signupTitle: string;
  signupDescription: string;
  signupBenefits: string[];
  loginSubmitLabel: string;
  signupSubmitLabel: string;
  accentClassName: string;
};

export const PERSONA_CONFIG: Record<AuthPersona, PersonaConfig> = {
  buyer: {
    label: "Buyer",
    shortLabel: "Buy",
    loginTitle: "Log in as a buyer",
    loginDescription:
      "Track listings, save favorites, and move through your buying journey with one account. Switch from renter-default anytime.",
    signupTitle: "Create your buyer account",
    signupDescription:
      "Start browsing seriously with saved searches, favorites, and buyer-focused follow-up when you need a buying-specific path.",
    signupBenefits: [
      "Save properties and compare them later",
      "Keep your buying journey in one place",
      "Get ready for future buyer-specific tools",
    ],
    loginSubmitLabel: "Log in as buyer",
    signupSubmitLabel: "Create buyer account",
    accentClassName: "from-sky-500/20 via-cyan-500/10 to-transparent",
  },
  seller: {
    label: "Seller",
    shortLabel: "Sell",
    loginTitle: "Log in as a seller",
    loginDescription:
      "Access listing tools, manage property activity, and prepare your next property launch.",
    signupTitle: "Create your seller account",
    signupDescription:
      "Set up a seller profile to create listings and manage your property pipeline.",
    signupBenefits: [
      "Prepare and publish listings faster",
      "Keep seller workflows inside the dashboard",
      "Move directly into property creation after onboarding",
    ],
    loginSubmitLabel: "Log in as seller",
    signupSubmitLabel: "Create seller account",
    accentClassName: "from-amber-500/25 via-orange-500/10 to-transparent",
  },
  renter: {
    label: "Renter",
    shortLabel: "Rent",
    loginTitle: "Log in as a renter",
    loginDescription:
      "Focus your account on rental discovery, saved homes, and upcoming renter workflows.",
    signupTitle: "Create your renter account",
    signupDescription:
      "Build a rental-focused account for searching, saving, and following listings that fit your move. This is the default persona for new users.",
    signupBenefits: [
      "Save rental listings for later review",
      "Keep rental intent separate from buying intent",
      "Be ready for renter-specific application flows",
    ],
    loginSubmitLabel: "Log in as renter",
    signupSubmitLabel: "Create renter account",
    accentClassName: "from-emerald-500/25 via-teal-500/10 to-transparent",
  },
  agent: {
    label: "Agent",
    shortLabel: "Agent",
    loginTitle: "Log in as an agent",
    loginDescription:
      "Work from an agent-oriented entrypoint that connects sign-in with your organization flow.",
    signupTitle: "Create your agent account",
    signupDescription:
      "Set up an agent profile, create or join an organization, and enter the dashboard with the right context.",
    signupBenefits: [
      "Create or join an organization after signup",
      "Land in an agent-oriented dashboard flow",
      "Keep agent work separate from marketplace browsing",
    ],
    loginSubmitLabel: "Log in as agent",
    signupSubmitLabel: "Create agent account",
    accentClassName: "from-rose-500/25 via-red-500/10 to-transparent",
  },
};

export function isAuthPersona(value: string): value is AuthPersona {
  return AUTH_PERSONAS.includes(value as AuthPersona);
}

export function getAuthCompletionPath(persona: AuthPersona, intent?: "login" | "signup") {
  const params = new URLSearchParams({ role: persona });
  if (intent) {
    params.set("intent", intent);
  }
  return `/auth/complete?${params.toString()}`;
}

export function getAuthLoginPath(persona: AuthPersona) {
  return `/auth/${persona}/login`;
}

export function getAuthSignupPath(persona: AuthPersona) {
  return `/auth/${persona}/signup`;
}

export function getOnboardingPath(persona: AuthPersona) {
  return `/onboarding/${persona}`;
}

export function getPersonaDestination(
  persona: AuthPersona,
  options?: { activeOrganizationId?: string | null },
) {
  if (persona === "seller") {
    return "/dashboard/properties/create";
  }

  if (persona === "agent") {
    return options?.activeOrganizationId ? "/dashboard/organizations" : "/dashboard";
  }

  return "/";
}
