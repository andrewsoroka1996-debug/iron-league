import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const page = read("app/account/link-player/page.tsx");
const form = read("components/player-account/ExistingPlayerLinkForm.tsx");
const linkApi = read("app/api/player-account/link-requests/route.ts");
const server = read("lib/player-account-link-server.ts");
const profilePage = read("app/account/new-player/page.tsx");

test("link page is server gated, no-indexed and presents only public legacy player data", () => {
  assert.match(page, /playerAccountsEnabled\(process\.env\.PLAYER_ACCOUNTS_ENABLED\)/);
  assert.match(page, /notFound\(\)/);
  assert.match(page, /index: false/);
  assert.match(page, /players\.map\(\(\{ id, nickname \}\) => \(\{ id, nickname \}\)\)/);
  assert.doesNotMatch(page, /SUPABASE_SECRET_KEY|admin\.rpc\(/);
});

test("application form never grants ownership, submits only selected known player ID to protected API", () => {
  assert.match(form, /\/api\/player-account\/link-requests/);
  assert.match(form, /method: "POST"/);
  assert.match(form, /JSON\.stringify\(\{ playerId \}\)/);
  assert.match(form, /known\.has\(playerId\)/);
  assert.match(form, /pending \|\| approved/);
  assert.match(form, /credentials: "same-origin"/);
  assert.doesNotMatch(form, /SUPABASE_SECRET_KEY|auth_user_id|admin_decide_player_discord_link|localStorage/);
});

test("statuses and existing API preserve admin-only approval", () => {
  for (const status of ['"pending": return "На розгляді"', '"approved": return "Схвалено"', '"rejected": return "Відхилено"']) {
    assert.ok(form.includes(status));
  }
  assert.match(form, /request\.status === "approved" && known\.has\(request\.player_id\)/);
  assert.match(linkApi, /handlePlayerLinkRequest/);
  assert.match(server, /client\.auth\.getUser\(\)/);
  assert.match(server, /knownPlayerIds\.has\(playerId\)/);
  assert.match(server, /admin\.rpc\("admin_decide_player_discord_link"/);
  assert.match(profilePage, /href="\/account\/link-player"/);
});
