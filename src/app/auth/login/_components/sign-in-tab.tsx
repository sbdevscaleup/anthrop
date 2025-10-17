"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { authClient } from "@/lib/auth/auth-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const signInSchema = z.object({
  email: z
    .email({ message: "Имэйл хаяг буруу байна. Зөв имэйл хаяг оруулна уу." })
    .min(1, {
      message: "Имэйл хаяг хоосон байж болохгүй.",
    }),
  password: z.string().min(6, {
    message: "Хэт богино байна! Нууц үг дор хаяж 6 тэмдэгтээс бүрдэнэ.",
  }),
});

type SignInForm = z.infer<typeof signInSchema>;

export function SingInTab({
  openEmailVerificationTab,
  openForgotPassword,
}: {
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
      { ...data, callbackURL: "/" },
      {
        onError: (error) => {
          if (error.error.code === "EMAIL_NOT_VERIFIED") {
            openEmailVerificationTab(data.email);
          }
          toast.error(error.error.message || "Failed to sign in");
        },
        onSuccess: () => {
          router.push("/");
        },
      }
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
              <FormLabel>Имэйл хаяг</FormLabel>
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
            // <FormItem>
            //   <FormLabel>Нууц үг</FormLabel>
            //   <FormControl>
            //     <PasswordInput {...field} />
            //   </FormControl>
            //   <FormMessage />
            // </FormItem>
            <FormItem>
              <div className="flex justify-between items-center">
                <FormLabel>Password</FormLabel>
                <Button
                  onClick={openForgotPassword}
                  type="button"
                  variant="link"
                  size="sm"
                  className="text-sm font-normal underline"
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
          <LoadingSwap isLoading={isSubmitting}>Нэвтэх</LoadingSwap>
        </Button>
      </form>
    </Form>
  );
}
