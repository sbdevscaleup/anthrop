import { headers } from "next/headers";
import { auth } from "@/modules/auth/infrastructure/auth";
import type { SessionProvider } from "@/modules/auth/application/session";

export const nextSessionProvider: SessionProvider = {
  async getSession() {
    return auth.api.getSession({ headers: await headers() });
  },
};
