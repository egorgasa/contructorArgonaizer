/**
 * Admin auth helpers.
 *
 * The MVP uses a single shared password set via the ADMIN_PASSWORD env var.
 * If the env var is empty/undefined, admin access is open (handy for local dev).
 * The session is a cookie holding the SHA-256 of the password — never the
 * password itself.
 *
 * Web Crypto is used so this code runs in the Edge middleware as well as in
 * Node API routes.
 */

export const ADMIN_COOKIE_NAME = "admin_auth";
/** Cookie lifetime in seconds — 30 days. */
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** SHA-256 hex digest of the given string, using Web Crypto. */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const view = new Uint8Array(digest);
  let out = "";
  for (let i = 0; i < view.length; i++) {
    out += view[i].toString(16).padStart(2, "0");
  }
  return out;
}

/** Returns the expected cookie value (sha256 of ADMIN_PASSWORD), or null if disabled. */
export async function expectedAuthCookie(): Promise<string | null> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return sha256Hex(pw);
}

/** True if admin protection is enabled (i.e. ADMIN_PASSWORD env var is set). */
export function isAdminProtectionEnabled(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}
