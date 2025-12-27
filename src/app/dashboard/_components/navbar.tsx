"use client";

import { Settings, User } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// import { Button } from "@/components/ui/button";
// import { useTheme } from "next-themes";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { authClient } from "@/lib/auth/auth-client";
import { BetterAuthActionButton } from "@/components/auth/better-auth-action-button";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  return (
    <nav className="p-4 flex items-center justify-between sticky top-0 bg-background z-10 border-b border-border">
      {/* LEFT */}
      <SidebarTrigger />

      <div className="flex items-center gap-4">
        <Link href="/">Home</Link>
        <ThemeSwitcher />
        {/* USER MENU */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar>
              <AvatarImage src="/images/logo2.svg" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={10}>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/dashboard/profile">
              <DropdownMenuItem>
                <User className="h-[1.2rem] w-[1.2rem] mr-2" />
                Профайл
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem>
              <Settings className="h-[1.2rem] w-[1.2rem] mr-2" />
              Тохиргоо
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <BetterAuthActionButton
                size="sm"
                className="w-full"
                variant="secondary"
                action={async () => {
                  await authClient.signOut();
                  router.push("/");
                  return { error: null };
                }}
              >
                Гарах
              </BetterAuthActionButton>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
