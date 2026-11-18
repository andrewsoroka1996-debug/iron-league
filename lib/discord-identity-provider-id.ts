/**
 * Supabase Auth identity.id is an INTERNAL UUID, not the Discord user ID.
 * auth.identities.provider_id is the Discord ID; in the Admin User API it is
 * represented in identity_data.provider_id (or identity_data.sub).
 * Display a validated snowflake only. SQL still derives the canonical ID.
 */
export function getDiscordProviderId(
  identity: { provider?: string; identity_data?: unknown } | null | undefined,
): string | null {
  if (identity?.provider !== "discord") return null;
  const data = identity.identity_data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const fields = data as Record<string, unknown>;
  for (const id of [fields.provider_id, fields.sub]) {
    if (typeof id === "string" && /^\d{15,22}$/.test(id)) return id;
  }
  return null;
}
