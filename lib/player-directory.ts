/** Pure catalog helpers; never mutate season lineups or database records. */
export type DirectoryPlayer = {
  id: string;
  nickname: string;
  account?: string | null;
  source: "legacy" | "dynamic";
};

type BasePlayer = { id: string; nickname: string; account?: string | null };
type ApprovedPlayer = BasePlayer & { source: "dynamic" | "legacy" };

function searchKey(text: string): string {
  return text.normalize("NFC").trim().toLocaleLowerCase("uk");
}

/** Historical entries win over DB entries on any collision. */
export function mergePlayerDirectory(
  historical: readonly BasePlayer[],
  approved: readonly ApprovedPlayer[] = []
): DirectoryPlayer[] {
  const seenIds = new Set<string>();
  const seenNicknames = new Set<string>();
  const result: DirectoryPlayer[] = [];

  for (const player of historical) {
    const idKey = player.id.toLowerCase();
    const nicknameKey = searchKey(player.nickname);
    if (seenIds.has(idKey) || seenNicknames.has(nicknameKey)) continue;
    seenIds.add(idKey);
    seenNicknames.add(nicknameKey);
    result.push({ id: player.id, nickname: player.nickname, account: player.account ?? null, source: "legacy" });
  }
  for (const player of approved) {
    if (player.source !== "dynamic") continue;
    const idKey = player.id.toLowerCase();
    const nicknameKey = searchKey(player.nickname);
    if (seenIds.has(idKey) || seenNicknames.has(nicknameKey)) continue;
    seenIds.add(idKey);
    seenNicknames.add(nicknameKey);
    result.push({ id: player.id, nickname: player.nickname, account: player.account ?? null, source: "dynamic" });
  }
  return result.sort((a, b) => a.nickname.localeCompare(b.nickname, "uk", { sensitivity: "base" }));
}

export function searchPlayerDirectory(
  directory: readonly DirectoryPlayer[],
  query: string
): DirectoryPlayer[] {
  const needle = searchKey(query.slice(0, 64));
  if (!needle) return [...directory];
  return directory.filter((player) =>
    searchKey(player.nickname).includes(needle) ||
    searchKey(player.id).includes(needle) ||
    (player.account != null && searchKey(player.account).includes(needle))
  );
}
