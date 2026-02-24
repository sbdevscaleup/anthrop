"use client"

import { BetterAuthActionButton } from "@/components/auth/better-auth-action-button"
import MapDemo from "@/components/landing/map-demo"
import { Button } from "@/components/ui/button"
import { LoadingSwap } from "@/components/ui/loading-swap"
import { authClient } from "@/lib/auth/auth-client"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function Home() {
  const [hasAdminPermission, setHasAdminPermission] = useState(false)
  const { data: session, isPending: loading } = authClient.useSession()

  useEffect(() => {
    authClient.admin
      .hasPermission({ permission: { user: ["list"] } })
      .then(({ data }) => {
        setHasAdminPermission(data?.success ?? false)
      })
  })

  return (
    <>
      <main>
        <div className="p-4 max-w-md mx-auto">
          <div className="text-center space-y-10">
            {session == null ? (
              <>
                <h1 className="text-3xl front-bold">
                  Welcome to Mongolia's Real Estate Platform
                </h1>
                {loading ? (
                  <Button size="lg" disabled>
                    <LoadingSwap isLoading={true}>Loading auth...</LoadingSwap>
                  </Button>
                ) : (
                  <Button asChild size="lg">
                    <Link href="/auth/login">Login / Register</Link>
                  </Button>
                )}
              </>
            ) : (
              <>
                <h1 className="text-3xl front-bold">
                  Welcome {session.user.name}!
                </h1>
                <div className="flex gap-4 justify-center">
                  <Button asChild size="lg">
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                  <Button asChild size="lg">
                    <Link href="/profile">Profile</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/organizations">Organization</Link>
                  </Button>
                  {hasAdminPermission && (
                    <Button variant="outline" asChild size="lg">
                      <Link href="/admin">Admin</Link>
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
            {/* DEMO MAP */}
            <MapDemo />
          </div>
        </div>
      </main>
    </>
  )
}
