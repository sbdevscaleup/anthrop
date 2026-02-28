import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/infrastructure/db/client";
import { nextCookies } from "better-auth/next-js";
import { sendPasswordResetEmail } from "@/modules/auth/infrastructure/emails/password-reset-email";
import { sendEmailVerificationEmail } from "@/modules/auth/infrastructure/emails/email-verification";
import { createAuthMiddleware } from "better-auth/api";
import { sendWelcomeEmail } from "@/modules/auth/infrastructure/emails/welcome-email";
import { sendDeleteAccountVerificationEmail } from "@/modules/auth/infrastructure/emails/delete-account-verification";
import { admin as adminPlugin } from "better-auth/plugins/admin";
import { ac, admin, user } from "@/modules/auth/domain/permissions";
import { organization } from "better-auth/plugins/organization";
import { phoneNumber } from "better-auth/plugins";
import { sendOrganizationInviteEmail } from "@/modules/auth/infrastructure/emails/organization-invite-emails";
import { member } from "@/infrastructure/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  isPhoneNumberSupported,
  sendPhoneOtp,
  verifyPhoneOtp,
} from "@/modules/auth/infrastructure/phone-otp-provider";

const phoneOtpLength = Number.parseInt(process.env.PHONE_OTP_LENGTH ?? "6", 10);
const phoneOtpExpiresInSeconds = Number.parseInt(
  process.env.PHONE_OTP_EXPIRES_IN_SECONDS ?? "300",
  10,
);
const useProviderManagedOtpVerification =
  process.env.PHONE_OTP_PROVIDER?.toLowerCase() === "callpro" &&
  Boolean(process.env.CALLPRO_OTP_VERIFY_API_URL);

export const auth = betterAuth({
  appName: "Anthrop App",
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async ({ user, url, newEmail }) => {
        await sendEmailVerificationEmail({
          user: { ...user, email: newEmail },
          url,
        });
      },
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        await sendDeleteAccountVerificationEmail({ user, url });
      },
    },
    additionalFields: {
      phoneNumber: {
        type: "string",
        required: true,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ user, url });
    },
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmailVerificationEmail({ user, url });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      mapProfileToUser: () => {
        return {
          phoneNumber: "00000000",
        };
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60, // 1 minute
    },
  },
  plugins: [
    nextCookies(),
    adminPlugin({
      ac,
      roles: {
        admin,
        user,
      },
    }),
    organization({
      sendInvitationEmail: async ({
        email,
        organization,
        inviter,
        invitation,
      }) => {
        await sendOrganizationInviteEmail({
          invitation,
          inviter: inviter.user,
          organization,
          email,
        });
      },
    }),
    phoneNumber({
      otpLength: Number.isNaN(phoneOtpLength) ? 6 : phoneOtpLength,
      expiresIn: Number.isNaN(phoneOtpExpiresInSeconds)
        ? 300
        : phoneOtpExpiresInSeconds,
      requireVerification: true,
      phoneNumberValidator: async (phoneNumber) => {
        return isPhoneNumberSupported(phoneNumber);
      },
      sendOTP: async ({ phoneNumber, code }) => {
        await sendPhoneOtp({ phoneNumber, code });
      },
      ...(useProviderManagedOtpVerification
        ? {
            verifyOTP: async ({ phoneNumber, code }) => {
              const result = await verifyPhoneOtp({ phoneNumber, code });
              return result === true;
            },
          }
        : {}),
    }),
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path.startsWith("/sign-up")) {
        const user = ctx.context.newSession?.user ?? {
          name: ctx.body.name,
          email: ctx.body.email,
        };

        if (user != null) {
          await sendWelcomeEmail(user);
        }
      }
    }),
  },
  databaseHooks: {
    session: {
      create: {
        before: async (userSession) => {
          const membership = await db.query.member.findFirst({
            where: eq(member.userId, userSession.userId),
            orderBy: desc(member.createdAt),
            columns: { organizationId: true },
          });

          return {
            data: {
              ...userSession,
              activeOrganizationId: membership?.organizationId,
            },
          };
        },
      },
    },
  },
});
