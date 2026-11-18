import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "app", "auth-test", "cabinet", "page.tsx");
const content = fs.readFileSync(file, "utf8");

test("isolated cabinet is dev-only, exact test host, test database and explicit flags", () => {
  for (const expected of [
    'process.env.NODE_ENV !== "development"',
    'process.env.IRON_LEAGUE_E2E_TEST_ONLY !== "true"',
    'process.env.PLAYER_ACCOUNTS_ENABLED !== "true"',
    'host !== "localhost:3001"',
    'supabaseHost !== "knrdsraydifnnbqycird.supabase.co"',
    'notFound()',
    'export const dynamic = "force-dynamic"',
  ]) {
    assert.ok(content.includes(expected), `Missing safety gate: ${expected}`);
  }
});

test("uses the real, ownership-checked cabinet component with verified test player ID", () => {
  assert.match(content, /import PlayerAccountPanel from/);
  assert.match(content, /<PlayerAccountPanel playerId="andrew-sm"\s*\/>/);
  assert.doesNotMatch(content, /PlayerAccountPanelPreview/);
  assert.doesNotMatch(content, /supabaseAdmin|SUPABASE_SECRET_KEY|ADMIN_PASSWORD/);
});

test("avoids loading full player profile dependencies", () => {
  assert.doesNotMatch(content, /getPlayerEmblemUrls|PlayerPage|loadPlayerStatistics|from\s+["'].*\/players\/\[id\]/);
  assert.match(content, /href="\/auth-test"/);
});
