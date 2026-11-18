/**
 * Pure, testable policy. This module must never grant access based on nickname,
 * Discord display name, or an unapproved request to link a profile.
 */
export type PlayerOwnershipDecision =
  | "disabled"
  | "invalid_profile"
  | "unauthenticated"
  | "unlinked"
  | "forbidden"
  | "owner"
  | "unavailable";

export type ApprovedPlayerLink = {
  auth_user_id: string;
  player_id: string;
};

/** Only literal `true` enables accounts; unset/other values fail closed. */
export function playerAccountsEnabled(rawValue: string | undefined): boolean {
  return rawValue === "true";
}

/**
 * The link MUST be read from the admin-controlled player_discord_links table
 * using the verified Supabase Auth user ID. The table must enforce uniqueness
 * and prohibit end-user INSERT/UPDATE/DELETE before feature activation.
 */
export function decidePlayerOwnership(input: {
  requestedPlayerId: string;
  knownPlayerIds: ReadonlySet<string>;
  verifiedAuthUserId: string | null;
  approvedLink: ApprovedPlayerLink | null;
}): PlayerOwnershipDecision {
  if (!input.knownPlayerIds.has(input.requestedPlayerId)) {
    return "invalid_profile";
  }
  if (!input.verifiedAuthUserId) {
    return "unauthenticated";
  }
  const link = input.approvedLink;
  if (!link) {
    return "unlinked";
  }
  if (
    link.auth_user_id !== input.verifiedAuthUserId ||
    !input.knownPlayerIds.has(link.player_id) ||
    link.player_id !== input.requestedPlayerId
  ) {
    return "forbidden";
  }
  return "owner";
}
