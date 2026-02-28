"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LogOut, Menu, User } from "lucide-react";
import { authClient } from "@/modules/auth/application/auth-client";
import { MARKETING_NAV_ITEMS } from "@/shared/config/marketing-nav";
import { cn } from "@/shared/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";
import { ThemeSwitcher } from "@/shared/ui/theme/theme-switcher";

type MarketingHeaderProps = {
  showAuthActions?: boolean;
};

export function MarketingHeader({ showAuthActions = true }: MarketingHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [isHydrated, setIsHydrated] = useState(false);
  const loggedIn = isHydrated && session != null;

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const initials = useMemo(() => {
    if (!session?.user?.name) return "U";
    return session.user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [session?.user?.name]);

  async function handleLogout() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Go to home">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            P
          </span>
          <span className="text-sm font-semibold tracking-wide sm:text-base">
            Property MN
          </span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex" aria-label="Marketing navigation">
          {MARKETING_NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeSwitcher />
          {showAuthActions &&
            (loggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open account menu">
                    <Avatar className="size-8">
                      <AvatarImage src={session?.user?.image ?? undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href="/dashboard/profile">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href="/auth">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth">Sign up</Link>
                </Button>
              </>
            ))}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeSwitcher />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-xs">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-2 px-4">
                {MARKETING_NAV_ITEMS.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>

              {showAuthActions && (
                <div className="mt-auto border-t p-4">
                  {loggedIn ? (
                    <div className="flex flex-col gap-2">
                      <SheetClose asChild>
                        <Button asChild variant="outline" className="w-full justify-start">
                          <Link href="/dashboard/profile">
                            <User className="mr-2 h-4 w-4" />
                            Profile
                          </Link>
                        </Button>
                      </SheetClose>
                      <Button
                        variant="destructive"
                        className="w-full justify-start"
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <SheetClose asChild>
                        <Button asChild variant="outline" className="w-full">
                          <Link href="/auth">Login</Link>
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button asChild className="w-full">
                          <Link href="/auth">Sign up</Link>
                        </Button>
                      </SheetClose>
                    </div>
                  )}
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
