import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (relative) => readFileSync(join(root, relative), "utf8");

// These are static guardrails; still run TypeScript, build and end-to-end tests.
test("new admin page stays behind PLAYER_ACCOUNTS_ENABLED", () => {
  const page = read("app/admin/player-accounts/page.tsx");
  assert.match(page, /playerAccountsEnabled\(process\.env\.PLAYER_ACCOUNTS_ENABLED\)/);
  assert.match(page, /notFound\(\)/);
  assert.match(page, /PlayerAccountLinksAdminPanel/);
});

test("admin navigation links are opt-in in both responsive menus", () => {
  const page = read("app/admin/page.tsx");
  assert.equal((page.match(/href="\/admin\/player-accounts"/g) || []).length, 2);
  assert.equal((page.match(/process\.env\.NEXT_PUBLIC_PLAYER_ACCOUNT_LINKS_ADMIN_MENU === "true"/g) || []).length, 2);
});

test("admin UI uses the password checked POST API without browser persistence", () => {
  const panel = read("components/admin/PlayerAccountLinksAdminPanel.tsx");
  assert.match(panel, /"\/api\/admin\/player-account-links"/);
  assert.match(panel, /method: "POST"/);
  assert.match(panel, /body: JSON\.stringify\(\{ password, \.\.\.body \}\)/);
  assert.doesNotMatch(panel, /localStorage|sessionStorage|document\.cookie|SUPABASE_SECRET_KEY/);
  assert.match(panel, /"approve" \| "reject"/);
  assert.match(panel, /window\.confirm\(/);
  assert.match(panel, /\^\\d\{15,22\}\$/);
});

test("existing server API retains admin authentication and atomic RPC", () => {
  const api = read("lib/player-account-link-server.ts");
  assert.match(api, /adminPasswordValid\(input\.password\)/);
  assert.match(api, /admin_decide_player_discord_link/);
  assert.match(api, /if \(!dynamicLinkFeatureEnabled\(\)\) return featureDisabledResponse\(\)/);
});

test("new profile request panel is embedded without automatic account creation", () => {
  const panel = read("components/admin/PlayerAccountLinksAdminPanel.tsx");
  assert.match(panel, /<NewProfileRequestsAdminPanel password=\{password\} allowApprovals=\{allowApprovals\} \/>/);
  const page = read("app/admin/player-accounts/page.tsx");
  assert.match(page, /allowApprovals=\{playerApprovalEnabled\(\)\}/);
  assert.doesNotMatch(panel, /\.from\("players"\)|createPlayer|insertPlayer/);
});
