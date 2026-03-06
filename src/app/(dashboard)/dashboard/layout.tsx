import Link from "next/link";
import { getDashboardRouteContext } from "@/app/(dashboard)/dashboard/_lib/context";
import { PersonaSwitcher } from "@/app/(dashboard)/dashboard/_components/persona-switcher";
import { ImpersonationIndicator } from "@/modules/auth/ui/impersonation-indicator";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, context } = await getDashboardRouteContext();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-muted-foreground">
              Home
            </Link>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-sm font-medium">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <PersonaSwitcher
              activePersona={context.activePersona}
              canAccessSeller={context.canAccessSeller}
              canAccessAgent={context.canAccessAgent}
            />
            <Link href="/dashboard/profile" className="text-sm text-muted-foreground">
              {session.user.name ?? "Profile"}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
      <ImpersonationIndicator />
    </div>
  );
}
