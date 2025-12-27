import type { Metadata } from "next";
import { Mulish, Roboto } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ImpersonationIndicator } from "@/components/auth/impersonation-indicator";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
// import { HeroHeader } from "@/components/header";
// import Header from "@/components/header"

const mulish = Mulish({
  weight: "variable",
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const roboto = Roboto({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "Property MN",
  description: "Real Estate Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "antialiased overscroll-none bg-background",
          roboto.variable,
          mulish.variable
        )}
      >
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
  );
}
