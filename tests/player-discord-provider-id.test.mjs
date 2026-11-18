import test from "node:test";
import assert from "node:assert/strict";
import { getDiscordProviderId } from "../lib/discord-identity-provider-id.ts";

test("returns true Discord snowflake, never Supabase internal identity UUID", () => {
  assert.equal(getDiscordProviderId({
    provider: "discord", id: "00000000-0000-4000-8000-000000000000",
    identity_data: { provider_id: "123456789012345678" },
  }), "123456789012345678");
});
test("falls back to provider sub when provider_id is not exposed", () => {
  assert.equal(getDiscordProviderId({
    provider: "discord", identity_data: { sub: "1234567890123456789" },
  }), "1234567890123456789");
});
test("fails closed for wrong provider and invalid identifiers", () => {
  assert.equal(getDiscordProviderId({ provider: "google", identity_data: { provider_id: "123456789012345678" } }), null);
  assert.equal(getDiscordProviderId({ provider: "discord", identity_data: { provider_id: "some-name" } }), null);
  assert.equal(getDiscordProviderId({ provider: "discord", identity_data: {} }), null);
  assert.equal(getDiscordProviderId(null), null);
});
