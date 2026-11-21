/**
 * Server-only policy for the NEW player-account administration endpoints.
 * Discord user IDs are provider snowflakes, not Supabase auth.users UUIDs,
 * Discord usernames, or user_metadata. Missing or invalid config FAILS CLOSED.
 */
const DISCORD_ID = /^\d{17,20}$/;
const MAX_ADMIN_IDS = 10;

export function adminDiscordIdentityAllowed(
  verifiedDiscordId: string | null | undefined,
  allowlistEnv: string | undefined,
): boolean {
  if (typeof verifiedDiscordId !== "string" || !DISCORD_ID.test(verifiedDiscordId)) return false;
  if (!allowlistEnv) return false;
  const entries = allowlistEnv.split(",").map((value) => value.trim());
  if (entries.length < 1 || entries.length > MAX_ADMIN_IDS) return false;
  if (entries.some((value) => !DISCORD_ID.test(value))) return false;
  if (new Set(entries).size !== entries.length) return false;
  return entries.includes(verifiedDiscordId);
}
