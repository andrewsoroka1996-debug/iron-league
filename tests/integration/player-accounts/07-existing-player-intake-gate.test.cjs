"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const repo = process.cwd();
const read = (file) => fs.readFileSync(path.join(repo, file), "utf8");

test("independent historical intake requires BOTH account and applications flags", () => {
  const policy = read("lib/player-account-access-policy.ts");
  assert.match(policy, /existingPlayerApplicationsEnabled\([\s\S]*?accountsFlag: string \| undefined,[\s\S]*?applicationsFlag: string \| undefined,/);
  assert.match(policy, /playerAccountsEnabled\(accountsFlag\) && applicationsFlag === "true"/);
});
test("historical application POST stops BEFORE auth and service-role writer when disabled", () => {
  const server = read("lib/player-account-link-server.ts");
  const fn = server.substring(server.indexOf("export async function handlePlayerLinkRequest"));
  const guard = fn.indexOf('if (method === "POST" && !dynamicLinkApplicationsEnabled()) return featureDisabledResponse();');
  assert.ok(guard > 0);
  assert.ok(guard < fn.indexOf('const session = userClient(request);'));
  assert.ok(guard < fn.indexOf('const writer = privilegedClient();'));
  assert.match(server, /IRON_LEAGUE_EXISTING_PLAYER_APPLICATIONS_ENABLED/);
});
test("historical link page is unavailable when intake flag is not true", () => {
  const page = read("app/account/link-player/page.tsx");
  assert.match(page, /existingPlayerApplicationsEnabled\(/);
  assert.match(page, /IRON_LEAGUE_EXISTING_PLAYER_APPLICATIONS_ENABLED/);
  assert.match(page, /\)\) notFound\(\)/);
});
test("account hub and newcomer page do not advertise closed historical intake", () => {
  const hub = read("app/account/page.tsx");
  const newcomer = read("app/account/new-player/page.tsx");
  assert.match(hub, /const existingApplicationsAvailable = existingPlayerApplicationsEnabled/);
  assert.match(hub, /\{existingApplicationsAvailable && \(/);
  assert.match(hub, /!existingApplicationsAvailable && !newApplicationsAvailable/);
  assert.match(newcomer, /existingPlayerApplicationsEnabled\(/);
});
test("newcomer intake and both approval switches remain independent", () => {
  const newServer = read("lib/player-profile-request-server.ts");
  const linkServer = read("lib/player-account-link-server.ts");
  assert.match(newServer, /IRON_LEAGUE_NEW_PLAYER_APPLICATIONS_ENABLED/);
  assert.match(newServer, /IRON_LEAGUE_NEW_PLAYER_APPROVAL_ENABLED/);
  assert.match(linkServer, /IRON_LEAGUE_EXISTING_PLAYER_APPROVAL_ENABLED/);
});
