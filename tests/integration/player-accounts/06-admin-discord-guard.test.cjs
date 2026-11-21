"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");
const { test } = require("node:test");

const root = resolve(__dirname, "../../..");
const load = (path) => readFileSync(join(root, path), "utf8");
const source = load("lib/player-account-admin-access-policy.ts");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const cjs = { exports: {} };
runInNewContext(transpiled.outputText, { module: cjs, exports: cjs.exports });
const { adminDiscordIdentityAllowed: allowed } = cjs.exports;

const owner = "123456789012345678";
const other = "234567890123456789";
const intruder = "987654321098765432";

test("fail-closed for blank, malformed, duplicated or excessive server allowlists", () => {
  for (const candidate of [undefined, "", " ", owner + ",", "," + owner,
    owner + ",not-an-id", owner + "," + owner, Array(11).fill(owner).join(",")]) {
    assert.equal(allowed(owner, candidate), false, String(candidate));
  }
});

test("only verified numeric Discord provider IDs in the full allowlist are authorized", () => {
  assert.equal(allowed(owner, owner), true);
  assert.equal(allowed(other, ` ${owner} , ${other} `), true);
  assert.equal(allowed(intruder, `${owner},${other}`), false);
  for (const id of [undefined, null, "", "andrew_sm_", "uuid-111", 123456789012345678]) {
    assert.equal(allowed(id, owner), false, String(id));
  }
});

test("both POST handlers run the Discord guard before admin password authentication", () => {
  for (const [file, handler] of [
    ["app/api/admin/player-account-links/route.ts", "handleAdminLinkRequest"],
    ["app/api/admin/player-profile-requests/route.ts", "handleAdminProfileRequest"],
  ]) {
    const content = load(file);
    assert.match(content, /withPlayerAccountAdminDiscordGuard/);
    assert.match(content, new RegExp(`return withPlayerAccountAdminDiscordGuard\\(request, \\(\\) => ${handler}\\(request\\)\\)`));
  }
});

test("session guard uses Supabase getUser identity and preserves SSR cookies", () => {
  const content = load("lib/player-account-admin-access-server.ts");
  assert.match(content, /import "server-only"/);
  assert.match(content, /createServerClient/);
  assert.match(content, /await client\.auth\.getUser\(\)/);
  assert.match(content, /getDiscordProviderId\(discordIdentity/);
  assert.match(content, /adminDiscordIdentityAllowed\(discordId, allowedIds\)/);
  assert.match(content, /cookieWrites\.push/);
  assert.match(content, /for \(const write of cookieWrites\) write\(result\)/);
  assert.match(content, /Cache-Control/);
  assert.ok(content.indexOf("await client.auth.getUser()") < content.indexOf(": await continueWithPasswordCheck()"));
});

test("existing admin password checks remain in server-only handlers", () => {
  for (const file of ["lib/player-account-link-server.ts", "lib/player-profile-request-server.ts"]) {
    const content = load(file);
    assert.match(content, /adminPasswordValid\(input\.password\)/);
    assert.match(content, /timingSafeEqual/);
    assert.match(content, /SUPABASE_SECRET_KEY/);
  }
});
