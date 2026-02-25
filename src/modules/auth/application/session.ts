export type AuthSession = {
  user: {
    id: string;
  };
  session: {
    activeOrganizationId?: string | null;
  };
};

export interface SessionProvider {
  getSession(): Promise<AuthSession | null>;
}

export async function getSessionOrNull(provider: SessionProvider) {
  return provider.getSession();
}

export async function getRequiredSession(provider: SessionProvider) {
  const session = await getSessionOrNull(provider);
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

