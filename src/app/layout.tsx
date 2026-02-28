import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "@/shared/ui/sonner"
import { ImpersonationIndicator } from "@/modules/auth/ui/impersonation-indicator"
import { ThemeProvider } from "@/shared/ui/theme/theme-provider"
import { cn } from "@/shared/lib/utils"

export const metadata: Metadata = {
  title: "Property MN",
  description: "Real Estate Platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("antialiased overscroll-none bg-background")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Toaster />
        <ImpersonationIndicator />
      </body>
    </html>
  )
}