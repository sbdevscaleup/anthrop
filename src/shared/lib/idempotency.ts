export function getIdempotencyKey(headers: Headers): string | null {
  const raw = headers.get("Idempotency-Key")?.trim() ?? "";
  if (!raw) return null;

  if (raw.length > 128) {
    throw new Error("INVALID_IDEMPOTENCY_KEY");
  }

  return raw;
}
