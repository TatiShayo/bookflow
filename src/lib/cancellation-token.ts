import { randomBytes, timingSafeEqual } from "crypto";

/**
 * Opaque, single-purpose token that authorises cancellation of a booking
 * without an authenticated session.
 *
 * Threat model: the token is emailed to the attendee, so anyone who can read
 * that attendee's mail can cancel. It is NOT a session credential and grants no
 * other access. It is 32 bytes of CSPRNG output — 256 bits — so it is not
 * guessable or enumerable.
 */
export function generateCancellationToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Constant-time comparison of a caller-supplied token against the stored one.
 *
 * Both sides are hashed to a fixed length first so `timingSafeEqual` never
 * throws on a length mismatch (it requires equal-length buffers), which would
 * otherwise leak the expected token's length.
 */
export function verifyCancellationToken(
  provided: string | null | undefined,
  expected: string | null | undefined
): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
