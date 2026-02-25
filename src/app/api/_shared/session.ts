import { getRequiredSession } from "@/modules/auth/application/session";
import { nextSessionProvider } from "@/modules/auth/infrastructure/session/next-session-provider";

export function getRequiredWebSession() {
  return getRequiredSession(nextSessionProvider);
}
