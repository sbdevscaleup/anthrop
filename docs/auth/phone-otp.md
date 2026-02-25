# Phone OTP Setup (Better Auth)

This project enables Better Auth phone OTP through the `phoneNumber` plugin.

## Environment variables

- `PHONE_OTP_PROVIDER`: `callpro` or `mock` (default: `mock`)
- `PHONE_OTP_TEMPLATE`: OTP SMS template, supports `{{code}}`
- `PHONE_OTP_LENGTH`: OTP code length (default: `6`)
- `PHONE_OTP_EXPIRES_IN_SECONDS`: OTP expiry in seconds (default: `300`)
- `CALLPRO_SMS_API_URL`: CallPro send SMS endpoint URL
- `CALLPRO_OTP_VERIFY_API_URL`: Optional CallPro OTP verify endpoint URL
- `CALLPRO_API_KEY`: API key/token for CallPro
- `CALLPRO_SENDER`: Optional sender identifier

## Current behavior

- `mock` provider:
  - Development: OTP is logged to server console for local testing.
  - Production: throws `PHONE_OTP_PROVIDER_NOT_CONFIGURED`.
- `callpro` provider:
  - Sends OTP through `CALLPRO_SMS_API_URL`.
  - If `CALLPRO_OTP_VERIFY_API_URL` is configured, verification is delegated to CallPro.
  - If verify URL is not configured, Better Auth uses internal OTP verification.

## Notes for CallPro integration

CallPro request/response shapes can vary by product/SDK. The current implementation expects:

- Send OTP response: HTTP `2xx` means success.
- Verify OTP response: JSON containing either `valid: true` or `success: true`.

Adjust `src/modules/auth/infrastructure/phone-otp-provider.ts` to match final CallPro API specs.
