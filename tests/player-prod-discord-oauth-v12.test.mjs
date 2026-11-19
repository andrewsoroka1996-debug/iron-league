import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDiscordProviderId } from "../lib/discord-identity-provider-id.ts";
import { isApprovedPilotDiscordIdentity } from "../lib/player-prod-oauth-pilot-policy.ts";

const file = (path) => readFileSync(join(process.cwd(), path), "utf8");
const allowed = "123456789012345678";

test("server-rendered pilot verifies user and canonical Discord identity before showing success", () => {
  const page = file("app/auth/discord-pilot/page.tsx");
  assert.match(page, /productionPilotEnabled\(/);
  assert.match(page, /requestHeaders\.get\("host"\)/);
  assert.match(page, /createServerClient\(/);
  assert.match(page, /cookieStore = await cookies\(\)/);
  assert.match(page, /supabase\.auth\.getUser\(\)/);
  assert.match(page, /getDiscordProviderId\(discordIdentity\)/);
  assert.match(page, /isApprovedPilotDiscordIdentity\(/);
  assert.match(page, /return <DiscordPilotClient verifiedName=\{verifiedName\} \/>/);
});

test("browser UI cannot independently claim a verified Discord session", () => {
  const client = file("app/auth/discord-pilot/DiscordPilotClient.tsx");
  assert.match(client, /verifiedName: string \| null/);
  assert.match(client, /const name = signedOut \? null : verifiedName/);
  assert.doesNotMatch(client, /auth\.getUser\(/);
  assert.doesNotMatch(client, /user_metadata/);
  assert.match(client, /auth\.signInWithOAuth\(/);
  assert.match(client, /auth\.signOut\(/);
  assert.doesNotMatch(client, /supabaseAdmin|ADMIN_PASSWORD|\/api\/admin\//);
});

test("Discord identity mismatch or unknown account fails closed in policy", () => {
  const canonical = { provider: "discord", id: allowed, identity_data: { provider_id: allowed, sub: allowed } };
  const approved = getDiscordProviderId(canonical);
  assert.equal(isApprovedPilotDiscordIdentity(approved, allowed), true);
  assert.equal(isApprovedPilotDiscordIdentity(getDiscordProviderId({
    ...canonical,
    identity_data: { provider_id: "999999999999999999" },
  }), allowed), false);
  assert.equal(isApprovedPilotDiscordIdentity(getDiscordProviderId({
    provider: "discord", id: "999999999999999999",
    identity_data: { provider_id: "999999999999999999" },
  }), allowed), false);
  assert.equal(isApprovedPilotDiscordIdentity(getDiscordProviderId({
    provider: "email", id: allowed,
  }), allowed), false);
});
