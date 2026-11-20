/** Safe, independent rules for applicants who do not yet have a player_id. */
export function normalizeRequestedNickname(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const nickname = value.normalize("NFC").trim().replace(/\s+/g, " ");
  if (nickname.length < 3 || nickname.length > 32) return null;
  if (!/^[\p{L}\p{N}._ -]+$/u.test(nickname)) return null;
  return nickname;
}

export function normalizeApplicantNote(value: unknown): string | null {
  if (value == null || value === "") return "";
  if (typeof value !== "string") return null;
  const note = value.trim();
  return note.length <= 500 ? note : null;
}

export function normalizeRejectionReason(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const reason = value.trim();
  return reason.length >= 5 && reason.length <= 500 ? reason : null;
}

export function canSubmitProfileRequest(input: {
  approvedLink: boolean;
  pendingLink: boolean;
  pendingProfileRequest: boolean;
}): boolean {
  return !input.approvedLink && !input.pendingLink && !input.pendingProfileRequest;
}
