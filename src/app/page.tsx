"use client";

import { BetterAuthActionButton } from "@/components/auth/better-auth-action-button";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [hasAdminPermission, setHasAdminPermission] = useState(false);
  const { data: session, isPending: loading } = authClient.useSession();

  useEffect(() => {
    authClient.admin
      .hasPermission({ permission: { user: ["list"] } })
      .then(({ data }) => {
        setHasAdminPermission(data?.success ?? false);
      });
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <main>
      <div className="px-4 max-w-md mx-auto">
        <div className="text-center space-y-6">
          {session == null ? (
            <>
              <h1 className="text-3xl front-bold">Тавтай морил</h1>
              {/* TODO: Add Loading States */}
              <Button asChild size="lg">
                <Link href="/auth/login">Нэвтрэх / Бүртгүүлэх</Link>
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-3xl front-bold">
                Тавтай морил {session.user.name}!
              </h1>
              <div className="flex gap-4 justify-center">
                <Button asChild size="lg">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <Button asChild size="lg">
                  <Link href="/profile">Профайл</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/organizations">Байгууллага</Link>
                </Button>
                {hasAdminPermission && (
                  <Button variant="outline" asChild size="lg">
                    <Link href="/admin">Админ</Link>
                  </Button>
                )}
                <BetterAuthActionButton
                  size="lg"
                  variant="destructive"
                  action={() => authClient.signOut()}
                >
                  Гарах
                </BetterAuthActionButton>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
