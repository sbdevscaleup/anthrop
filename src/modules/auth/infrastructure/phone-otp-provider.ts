type OtpPayload = {
  phoneNumber: string;
  code: string;
};

type OtpProvider = "callpro" | "mock";

const E164_REGEX = /^\+[1-9]\d{7,14}$/;
const MONGOLIA_LOCAL_REGEX = /^\d{8}$/;

function getOtpProvider(): OtpProvider {
  const configured = process.env.PHONE_OTP_PROVIDER?.toLowerCase();
  return configured === "callpro" ? "callpro" : "mock";
}

function normalizePhoneNumber(rawPhoneNumber: string) {
  const compact = rawPhoneNumber.replace(/[^\d+]/g, "");

  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("976")) return `+${compact}`;
  if (MONGOLIA_LOCAL_REGEX.test(compact)) return `+976${compact}`;

  return compact;
}

function buildOtpMessage(code: string) {
  const template = process.env.PHONE_OTP_TEMPLATE ?? "Your verification code is {{code}}.";
  return template.replace("{{code}}", code);
}

async function sendOtpWithCallPro(payload: OtpPayload) {
  const apiUrl = process.env.CALLPRO_SMS_API_URL;
  const apiKey = process.env.CALLPRO_API_KEY;
  const sender = process.env.CALLPRO_SENDER;

  if (!apiUrl || !apiKey) {
    throw new Error("CALLPRO_NOT_CONFIGURED");
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      to: normalizePhoneNumber(payload.phoneNumber),
      message: buildOtpMessage(payload.code),
      ...(sender ? { from: sender } : {}),
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `CALLPRO_SEND_FAILED:${response.status}:${responseBody.slice(0, 200)}`,
    );
  }
}

async function verifyOtpWithCallPro(payload: OtpPayload) {
  const verifyApiUrl = process.env.CALLPRO_OTP_VERIFY_API_URL;
  const apiKey = process.env.CALLPRO_API_KEY;

  if (!verifyApiUrl || !apiKey) {
    return null;
  }

  const response = await fetch(verifyApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      to: normalizePhoneNumber(payload.phoneNumber),
      code: payload.code,
    }),
  });

  if (!response.ok) return false;

  const body = (await response.json()) as { valid?: boolean; success?: boolean };
  return body.valid === true || body.success === true;
}

export async function sendPhoneOtp(payload: OtpPayload) {
  if (getOtpProvider() === "callpro") {
    await sendOtpWithCallPro(payload);
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("PHONE_OTP_PROVIDER_NOT_CONFIGURED");
  }

  console.info(
    `[DEV_PHONE_OTP] ${normalizePhoneNumber(payload.phoneNumber)} -> ${payload.code}`,
  );
}

export async function verifyPhoneOtp(payload: OtpPayload) {
  if (getOtpProvider() !== "callpro") return null;
  return verifyOtpWithCallPro(payload);
}

export async function isPhoneNumberSupported(rawPhoneNumber: string) {
  const normalized = normalizePhoneNumber(rawPhoneNumber);
  return E164_REGEX.test(normalized);
}
