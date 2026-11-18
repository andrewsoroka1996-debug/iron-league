import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import test from "node:test";

const page = readFileSync("app/players/[id]/page.tsx", "utf8");
const panel = readFileSync("components/player-account/PlayerAccountPanel.tsx", "utf8");
const api = readFileSync("app/api/player-account/matches/route.ts", "utf8");

test("profile mounts account panel only behind server feature gate", () => {
  assert.match(page, /playerAccountsEnabled\(process\.env\.PLAYER_ACCOUNTS_ENABLED\)/);
  assert.match(page, /<PlayerAccountPanel key=\{playerId\} playerId=\{playerId\}/);
});

test("real panel does not use a locally editable owner flag", () => {
  assert.doesNotMatch(panel, /setIsOwner|useState\(true\)|Гість.*Власник/s);
  assert.match(panel, /if \(state\.kind !== "verified"\) return null/);
  assert.match(panel, /credentials: "same-origin"/);
});

test("server route checks ownership before loading matches", () => {
  const auth = api.indexOf("await checkPlayerOwnershipForRequest");
  const load = api.indexOf("await loadSeason4DirectPlayerMatchGroups");
  assert.ok(auth >= 0 && load > auth);
  assert.match(api, /case "owner":/);
  assert.match(api, /"Cache-Control", "private, no-store"/);
});

test("no result submission or database mutation added", () => {
  assert.doesNotMatch(api, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  assert.doesNotMatch(panel, /method:\s*"POST"/);
});
