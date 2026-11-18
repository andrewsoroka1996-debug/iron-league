/**
 * Pure business rules. Linking to a player always requires a separate
 * administrator decision; Discord display names never prove ownership.
 */
export type LinkRequestDecision =
  | "disabled"
  | "unauthenticated"
  | "discord_required"
  | "invalid_profile"
  | "already_linked"
  | "pending_exists"
  | "allowed";

export function decideLinkRequest(input: {
  enabled: boolean;
  verifiedUserId: string | null;
  hasVerifiedDiscordIdentity: boolean;
  requestedPlayerId: string;
  knownPlayerIds: ReadonlySet<string>;
  existingApprovedLink: boolean;
  hasPendingRequest: boolean;
}): LinkRequestDecision {
  if (!input.enabled) return "disabled";
  if (!input.verifiedUserId) return "unauthenticated";
  if (!input.hasVerifiedDiscordIdentity) return "discord_required";
  if (!input.knownPlayerIds.has(input.requestedPlayerId)) return "invalid_profile";
  if (input.existingApprovedLink) return "already_linked";
  if (input.hasPendingRequest) return "pending_exists";
  return "allowed";
}

export function parseAdminLinkAction(input: unknown):
  | { action: "list" }
  | { action: "approve" | "reject"; requestId: string; reason: string | null }
  | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  if (record.action === "list") return { action: "list" };
  if (record.action !== "approve" && record.action !== "reject") return null;
  if (typeof record.requestId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(record.requestId)) {
    return null;
  }
  const reason = typeof record.reason === "string" ? record.reason.trim() : "";
  if (reason.length > 500) return null;
  if (record.action === "reject" && reason.length < 5) return null;
  return {
    action: record.action,
    requestId: record.requestId,
    reason: reason || null,
  };
}
