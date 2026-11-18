/** Side-effect-free rules shared between UI and server. */
export const RESULT_SCREENSHOT_MAX_BYTES = 8 * 1024 * 1024;
export const RESULT_BATCH_MAX = 2;
export const RESULT_MAX_GOALS = 99;
export const RESULT_REASON_MIN = 12;
export const RESULT_REASON_MAX = 1000;
export const RESULT_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * Basic structure check for missing-screenshot explanations.
 * This rejects accidental text and one-word gibberish; the administrator still
 * decides whether the explanation is credible. Never an automated approval.
 */
export function validateScreenshotAbsenceReason(value: string): string | null {
  const reason = value.trim();
  if (reason.length < RESULT_REASON_MIN || reason.length > RESULT_REASON_MAX) {
    return "Пояснення має містити від 12 до 1000 символів.";
  }
  const words = reason.match(/[\p{L}]{2,}/gu) ?? [];
  const distinct = new Set(words.map((word) => word.toLocaleLowerCase()));
  if (words.length < 3 || distinct.size < 3) {
    return "Опишіть причину відсутності скриншота щонайменше трьома різними словами.";
  }
  if (/([\p{L}])\1{7,}/iu.test(reason)) {
    return "Поясніть причину звичайними словами, без повторення символів.";
  }
  return null;
}

export type ResultSubmissionItem = {
  match_id: string;
  home_goals: number;
  away_goals: number;
  no_screenshot_reason: string | null;
};

export function validateResultSubmissionItems(input: unknown): {
  ok: true; items: ResultSubmissionItem[];
} | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length < 1 || input.length > RESULT_BATCH_MAX) {
    return { ok: false, error: "Можна подати від одного до двох результатів одночасно." };
  }
  const seen = new Set<string>();
  const items: ResultSubmissionItem[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, error: "Неправильний формат результату." };
    }
    const record = item as Record<string, unknown>;
    const matchId = record.match_id;
    if (typeof matchId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(matchId) || seen.has(matchId)) {
      return { ok: false, error: "Неправильний або повторний ідентифікатор матчу." };
    }
    seen.add(matchId);
    const goals = [record.home_goals, record.away_goals];
    if (goals.some((value) => !Number.isInteger(value) || (value as number) < 0 || (value as number) > RESULT_MAX_GOALS)) {
      return { ok: false, error: "Рахунок має складатися з цілих чисел від 0 до 99." };
    }
    const rawReason = record.no_screenshot_reason;
    if (rawReason !== undefined && rawReason !== null && typeof rawReason !== "string") {
      return { ok: false, error: "Неправильний формат пояснення." };
    }
    const reason = typeof rawReason === "string" ? rawReason.trim() : "";
    if (reason.length > 0) {
      const issue = validateScreenshotAbsenceReason(reason);
      if (issue) return { ok: false, error: issue };
    }
    items.push({ match_id: matchId, home_goals: goals[0] as number, away_goals: goals[1] as number,
      no_screenshot_reason: reason || null });
  }
  return { ok: true, items };
}

export function validateResultEvidence(meta: {size: number; type: string; bytes: Uint8Array}): string | null {
  if (!Number.isSafeInteger(meta.size) || meta.size <= 0 || meta.size > RESULT_SCREENSHOT_MAX_BYTES) {
    return "Скриншот має бути не більшим за 8 МБ.";
  }
  if (!RESULT_ALLOWED_MIME.includes(meta.type as (typeof RESULT_ALLOWED_MIME)[number])) {
    return "Потрібен скриншот у форматі JPG, PNG або WebP.";
  }
  const bytes = meta.bytes;
  const jpg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b);
  const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  const valid = (meta.type === "image/jpeg" && jpg) ||
    (meta.type === "image/png" && png) || (meta.type === "image/webp" && webp);
  return valid ? null : "Файл не відповідає заявленому формату зображення.";
}

export function eligibleForPlayerResultRequest(match: {
  id: string; season: number; status: string; participant_type: string; home_id: string; away_id: string;
}, playerId: string): boolean {
  return match.season === 4 && match.participant_type === "player" &&
    match.home_id !== match.away_id && (match.home_id === playerId || match.away_id === playerId) &&
    (match.status === "scheduled" || match.status === "closed_unplayed");
}
