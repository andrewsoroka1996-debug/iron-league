/** Pure validation shared by the admin route and its unit tests. */
export type ResultReviewAction = "approve" | "reject";
export type ResultReviewFilter = "pending" | "reviewed";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MIN_REJECTION_REASON = 8;
export const MAX_REVIEW_REASON = 500;

export function validateResultReviewAction(input: unknown):
  | { ok: true; requestId: string; action: ResultReviewAction; expectedRevision: number; reason: string | null }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Некоректний запит" };
  }
  const raw = input as Record<string, unknown>;
  if (raw.action !== "approve" && raw.action !== "reject") {
    return { ok: false, error: "Невідома дія адміністратора" };
  }
  if (typeof raw.request_id !== "string" || !UUID.test(raw.request_id)) {
    return { ok: false, error: "Некоректний ID заявки" };
  }
  if (!Number.isInteger(raw.expected_revision) || (raw.expected_revision as number) < 1 || (raw.expected_revision as number) > 1000000) {
    return { ok: false, error: "Некоректна версія заявки" };
  }
  if (raw.reason !== undefined && raw.reason !== null && typeof raw.reason !== "string") {
    return { ok: false, error: "Некоректний коментар" };
  }
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  if (reason.length > MAX_REVIEW_REASON) {
    return { ok: false, error: "Коментар надто довгий (до 500 символів)" };
  }
  if (raw.action === "reject" && reason.length < MIN_REJECTION_REASON) {
    return { ok: false, error: "Для відхилення вкажіть причину (мінімум 8 символів)" };
  }
  return { ok: true, requestId: raw.request_id, action: raw.action, expectedRevision: raw.expected_revision as number, reason: reason || null };
}

export function parseResultReviewFilter(value: unknown): ResultReviewFilter | null {
  return value === "pending" || value === "reviewed" ? value : null;
}
