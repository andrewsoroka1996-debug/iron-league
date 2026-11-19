import test from "node:test";
import assert from "node:assert/strict";
import { getDiscordProviderId } from "../lib/discord-identity-provider-id.ts";

const DISCORD_ID = "123456789012345678";
const OTHER_ID = "999999999999999999";
const SUPABASE_IDENTITY_UUID = "00000000-0000-4000-8000-000000000000";

test("uses Supabase Auth UserIdentity.id for canonical Discord ID, not identity_id UUID", () => {
  assert.equal(getDiscordProviderId({
    provider: "discord", id: DISCORD_ID, identity_id: SUPABASE_IDENTITY_UUID,
    identity_data: { provider_id: DISCORD_ID, sub: DISCORD_ID },
  }), DISCORD_ID);
});

test("accepts provider ID with consistent optional metadata", () => {
  assert.equal(getDiscordProviderId({ provider: "discord", id: DISCORD_ID }), DISCORD_ID);
  assert.equal(getDiscordProviderId({
    provider: "discord", id: DISCORD_ID, identity_data: { sub: DISCORD_ID },
  }), DISCORD_ID);
  assert.equal(getDiscordProviderId({
    provider: "discord", id: DISCORD_ID, identity_data: { provider_id: DISCORD_ID },
  }), DISCORD_ID);
});

test("blocks conflicting or malformed identity metadata", () => {
  assert.equal(getDiscordProviderId({
    provider: "discord", id: DISCORD_ID,
    identity_data: { provider_id: OTHER_ID, sub: DISCORD_ID },
  }), null);
  assert.equal(getDiscordProviderId({
    provider: "discord", id: DISCORD_ID,
    identity_data: { provider_id: DISCORD_ID, sub: OTHER_ID },
  }), null);
  assert.equal(getDiscordProviderId({
    provider: "discord", id: DISCORD_ID, identity_data: { sub: null },
  }), null);
  assert.equal(getDiscordProviderId({
    provider: "discord", id: DISCORD_ID, identity_data: "invalid",
  }), null);
});

test("never falls back to editable metadata when the authoritative ID is absent or invalid", () => {
  assert.equal(getDiscordProviderId({
    provider: "discord", identity_id: SUPABASE_IDENTITY_UUID,
    identity_data: { provider_id: DISCORD_ID, sub: DISCORD_ID },
  }), null);
  assert.equal(getDiscordProviderId({
    provider: "discord", id: SUPABASE_IDENTITY_UUID,
    identity_data: { provider_id: DISCORD_ID },
  }), null);
  assert.equal(getDiscordProviderId({
    provider: "discord", id: "a-user-name",
    identity_data: { sub: DISCORD_ID },
  }), null);
  assert.equal(getDiscordProviderId({
    provider: "discord", id: OTHER_ID,
    identity_data: { sub: DISCORD_ID },
  }), null);
});

test("fails closed for other providers, null and invalid snowflake lengths", () => {
  assert.equal(getDiscordProviderId({ provider: "google", id: DISCORD_ID }), null);
  assert.equal(getDiscordProviderId({ provider: "discord", id: "123" }), null);
  assert.equal(getDiscordProviderId({ provider: "discord", id: "123456789012345678901" }), null);
  assert.equal(getDiscordProviderId({ provider: "discord", id: "" }), null);
  assert.equal(getDiscordProviderId(null), null);
});
