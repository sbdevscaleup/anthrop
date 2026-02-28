"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";
import { Button } from "@/shared/ui/button";
import { authClient } from "@/modules/auth/application/auth-client";
import {
  PERSONA_CONFIG,
  type AuthPersona,
  getAuthCompletionPath,
  getAuthLoginPath,
  getAuthSignupPath,
} from "@/modules/auth/domain/personas";
import { EmailVerification } from "@/app/(auth)/auth/login/_components/email-verification";
import { ForgotPassword } from "@/app/(auth)/auth/login/_components/forgot-password";
import { PersonaSignInForm } from "@/app/(auth)/auth/login/_components/sign-in-tab";
import { PersonaSignUpForm } from "@/app/(auth)/auth/login/_components/sign-up-tab";
import { SocialAuthButtonsWithRedirect } from "@/app/(auth)/auth/login/_components/social-auth-buttons";

type ViewTab = "base" | "email-verification" | "forgot-password";

export function PersonaAuthView({
  persona,
  mode,
}: {
  persona: AuthPersona;
  mode: "login" | "signup";
}) {
  const router = useRouter();
  const config = PERSONA_CONFIG[persona];
  const [email, setEmail] = useState("");
  const [selectedTab, setSelectedTab] = useState<ViewTab>("base");
  const completionPath = getAuthCompletionPath(persona, mode);

  useEffect(() => {
    authClient.getSession().then((session) => {
      if (session.data != null) {
        router.replace(completionPath);
      }
    });
  }, [completionPath, router]);

  function openEmailVerificationTab(nextEmail: string) {
    setEmail(nextEmail);
    setSelectedTab("email-verification");
  }

  const oppositeModePath =
    mode === "login" ? getAuthSignupPath(persona) : getAuthLoginPath(persona);

  return (
    <Card className="w-full max-w-xl rounded-[1.75rem] border border-border/70 bg-background/95 shadow-2xl">
      <CardHeader className="space-y-3">
        <CardTitle className="text-2xl">
          {mode === "login" ? config.loginTitle : config.signupTitle}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              Need a new {config.label.toLowerCase()} account?{" "}
              <Button
                variant="link"
                className="h-auto p-0"
                onClick={() => router.push(oppositeModePath)}
              >
                Create one
              </Button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Button
                variant="link"
                className="h-auto p-0"
                onClick={() => router.push(oppositeModePath)}
              >
                Log in
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {selectedTab === "base" && mode === "login" ? (
          <PersonaSignInForm
            persona={persona}
            callbackURL={completionPath}
            submitLabel={config.loginSubmitLabel}
            openEmailVerificationTab={openEmailVerificationTab}
            openForgotPassword={() => setSelectedTab("forgot-password")}
          />
        ) : null}

        {selectedTab === "base" && mode === "signup" ? (
          <PersonaSignUpForm
            persona={persona}
            callbackURL={completionPath}
            submitLabel={config.signupSubmitLabel}
            openEmailVerificationTab={openEmailVerificationTab}
          />
        ) : null}

        {selectedTab === "email-verification" ? (
          <div className="space-y-4">
            <EmailVerification email={email} callbackURL={completionPath} />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSelectedTab("base")}
            >
              Back
            </Button>
          </div>
        ) : null}

        {selectedTab === "forgot-password" ? (
          <ForgotPassword openSignInTab={() => setSelectedTab("base")} />
        ) : null}
      </CardContent>

      {selectedTab === "base" ? (
        <>
          <Separator />
          <CardFooter className="grid grid-cols-2 gap-3">
            <SocialAuthButtonsWithRedirect
              callbackURL={completionPath}
              newUserCallbackURL={completionPath}
            />
          </CardFooter>
        </>
      ) : null}
    </Card>
  );
}
