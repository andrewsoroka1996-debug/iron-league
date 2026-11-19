/**
 * For Supabase Auth's JSON UserIdentity, `id` is the OAuth provider's user ID,
 * while `identity_id` is Supabase's internal identity UUID. For Discord, `id`
 * must be a numeric snowflake. Optional provider metadata must not contradict
 * this canonical ID. Never authorize using user.user_metadata.
 *
 * Source: Supabase Auth internal/models/identity.go (json tags for ProviderID
 * and ID). This helper consumes identities returned by Supabase Auth, not
 * arbitrary client-supplied identity objects.
 */
const DISCORD_SNOWFLAKE = /^\d{17,20}$/;

export function getDiscordProviderId(
  identity: { provider?: string; id?: string; identity_data?: unknown } | null | undefined,
): string | null {
  if (identity?.provider !== "discord") return null;
  const id = identity.id;
  if (typeof id !== "string" || !DISCORD_SNOWFLAKE.test(id)) return null;

  const metadata = identity.identity_data;
  if (metadata === undefined || metadata === null) return id;
  if (typeof metadata !== "object" || Array.isArray(metadata)) return null;

  const fields = metadata as Record<string, unknown>;
  for (const key of ["provider_id", "sub"] as const) {
    if (Object.prototype.hasOwnProperty.call(fields, key) && fields[key] !== id) {
      return null;
    }
  }
  return id;
}
