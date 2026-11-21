const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const sql = read('sql/REVIEW-ONLY-iron-league-player-accounts-prepared-v5_2.sql');
const template = read('sql/REVIEW-ONLY-iron-league-player-accounts-foundation.sql');
const links = read('lib/player-account-link-server.ts');
const profiles = read('lib/player-profile-request-server.ts');
const runner = read('tests/integration/player-accounts/run-local-tests-v5_2.ps1');
const verify = read('tests/integration/player-accounts/02-verify-v5_2.sql');
const race = read('tests/integration/player-accounts/04-concurrent-requests-v5_2.ps1');

test('v5.2 denies direct authenticated INSERT on both application tables', () => {
  for (const source of [template, sql]) {
    assert.match(source, /SERVER-ONLY REQUEST WRITES/);
    assert.doesNotMatch(source, /GRANT INSERT \(/);
    assert.doesNotMatch(source, /CREATE POLICY applicant_inserts_/);
    assert.equal((source.match(/CREATE POLICY /g) || []).length, 4);
    for (const name of ['player_discord_link_requests', 'player_profile_creation_requests']) {
      assert.match(source, new RegExp(`GRANT SELECT ON public\.${name} TO authenticated;`));
      assert.match(source, new RegExp(`GRANT ALL ON public\.${name} TO service_role;`));
    }
  }
});

test('Next.js routes use privileged writes only after verified getUser/Discord checks', () => {
  for (const [source, writer] of [[links, 'privilegedClient'], [profiles, 'adminClient']]) {
    const handler = source.slice(source.indexOf('export async function handle'));
    assert.match(handler, /await client\.auth\.getUser\(\)/);
    assert.match(handler, /getDiscordProviderId\(discordIdentity\)/);
    assert.match(handler, new RegExp(`const writer = ${writer}\(\)`));
    assert.match(handler, /await writer\.from\(/);
    assert.doesNotMatch(handler.slice(0,handler.indexOf('function adminPasswordValid')), /await client\.from\([^\n]+\)\s*\.insert/);
  }
  assert.match(links, /IRON_LEAGUE_EXISTING_PLAYER_APPROVAL_ENABLED/);
});

test('local runner targets the isolated v5.2 tests, never Production', () => {
  assert.match(runner, /prepared-v5_2\.sql/);
  assert.match(runner, /02-verify-v5_2\.sql/);
  assert.match(runner, /04-concurrent-requests-v5_2\.ps1/);
  assert.match(verify, /direct browser link INSERT/);
  assert.match(verify, /has_table_privilege\('authenticated','public\.player_discord_link_requests','INSERT'\)/);
  assert.equal((race.match(/SET ROLE service_role;/g) || []).length, 2);
  assert.doesNotMatch(race, /SET ROLE authenticated;/);
});

test('public account has sign out button and cookie-aware signOut', () => {
  assert.match(read('app/account/page.tsx'), /PublicDiscordSignOut/);
  assert.match(read('components/player-account/PublicDiscordSignOut.tsx'), /createBrowserClient/);
  assert.match(read('components/player-account/PublicDiscordSignOut.tsx'), /auth\.signOut/);
});
