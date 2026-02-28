"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { PasswordInput } from "@/shared/ui/password-input";
import { Button } from "@/shared/ui/button";
import { LoadingSwap } from "@/shared/ui/loading-swap";
import { authClient } from "@/modules/auth/application/auth-client";
import type { AuthPersona } from "@/modules/auth/domain/personas";
import { toast } from "sonner";

const signInSchema = z.object({
  email: z.email().min(1, "Email is required"),
  password: z.string().min(6, "Password is required"),
});

type SignInForm = z.infer<typeof signInSchema>;

export function PersonaSignInForm({
  callbackURL,
  submitLabel,
  openEmailVerificationTab,
  openForgotPassword,
}: {
  persona: AuthPersona;
  callbackURL: string;
  submitLabel: string;
  openEmailVerificationTab: (email: string) => void;
  openForgotPassword: () => void;
}) {
  const router = useRouter();
  const form = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { isSubmitting } = form.formState;

  async function handleSignIn(data: SignInForm) {
    await authClient.signIn.email(
      { ...data, callbackURL },
      {
        onError: (error) => {
          if (error.error.code === "EMAIL_NOT_VERIFIED") {
            openEmailVerificationTab(data.email);
          }
          toast.error(error.error.message || "Failed to sign in");
        },
        onSuccess: () => {
          router.replace(callbackURL);
        },
      },
    );
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(handleSignIn)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <Button
                  onClick={openForgotPassword}
                  type="button"
                  variant="link"
                  size="sm"
                  className="px-0 text-sm font-normal underline"
                >
                  Forgot password?
                </Button>
              </div>
              <FormControl>
                <PasswordInput {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          <LoadingSwap isLoading={isSubmitting}>{submitLabel}</LoadingSwap>
        </Button>
      </form>
    </Form>
  );
}

export const SignInTab = PersonaSignInForm;
