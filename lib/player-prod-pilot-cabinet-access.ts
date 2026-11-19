/**
 * Narrow, temporary read-only production pilot binding.
 * The real player account linking system is deliberately NOT enabled here.
 * Only a single server-configured canonical Discord ID can access Andrew_SM.
 */
export const PILOT_CABINET_PLAYER_ID = "andrew-sm";

export function isSingleApprovedPilotDiscordIdentity(
  discordId: string | null | undefined,
  allowedIds: ReadonlySet<string>,
): boolean {
  return typeof discordId === "string" &&
    /^\d{15,22}$/.test(discordId) &&
    allowedIds.size === 1 &&
    allowedIds.has(discordId);
}
