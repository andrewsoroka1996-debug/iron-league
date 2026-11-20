/** Pure display rules: never grant access or infer approval from a nickname. */
export type ProfileApplicationDisplay = {
  status: string;
  approved_player_id?: string | null;
};

export function profileRequestStatusLabel(status: string): string {
  switch (status) {
    case "pending": return "На розгляді";
    case "approved": return "Схвалено";
    case "rejected": return "Відхилено";
    default: return "Невідомий статус";
  }
}

/** The DB approval RPC generates this fixed, non-user-controlled ID shape. */
export function approvedPlayerProfileHref(request: ProfileApplicationDisplay): string | null {
  if (request.status !== "approved") return null;
  const id = request.approved_player_id;
  if (typeof id !== "string" || !/^il-[0-9a-f]{32}$/.test(id)) return null;
  return `/players/${id}`;
}
