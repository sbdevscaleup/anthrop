import { Resend } from "resend";

const DEFAULT_DEV_FROM_EMAIL = "onboarding@resend.dev";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

let resendClient: Resend | null = null;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing. Configure it in your environment.");
  }

  if (resendClient == null) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

function getFromEmail() {
  const configuredFrom = process.env.RESEND_FROM_EMAIL?.trim();
  if (configuredFrom) {
    return configuredFrom;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_DEV_FROM_EMAIL;
  }

  throw new Error(
    "RESEND_FROM_EMAIL is missing in production. Set a verified sender address.",
  );
}

function isSenderVerificationError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("domain is not verified") ||
    normalized.includes("verify your domain") ||
    (normalized.includes("from address") && normalized.includes("not verified"))
  );
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  const resend = getResendClient();
  const from = getFromEmail();

  const primarySend = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });

  if (!primarySend.error) {
    return primarySend.data;
  }

  if (
    process.env.NODE_ENV !== "production" &&
    from !== DEFAULT_DEV_FROM_EMAIL &&
    isSenderVerificationError(primarySend.error.message)
  ) {
    const fallbackSend = await resend.emails.send({
      from: DEFAULT_DEV_FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });

    if (!fallbackSend.error) {
      console.warn(
        `Resend sender "${from}" is unverified in development. Falling back to "${DEFAULT_DEV_FROM_EMAIL}".`,
      );
      return fallbackSend.data;
    }

    throw new Error(
      `Resend email send failed with "${from}" (${primarySend.error.message}). Fallback "${DEFAULT_DEV_FROM_EMAIL}" failed (${fallbackSend.error.message}).`,
    );
  }

  throw new Error(`Resend email send failed: ${primarySend.error.message}`);
}
