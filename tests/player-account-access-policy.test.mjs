import assert from "node:assert/strict";
import test from "node:test";
import {
  decidePlayerOwnership,
  playerAccountsEnabled,
} from "../lib/player-account-access-policy.ts";

const knownPlayerIds = new Set(["andrew-sm", "another-player"]);
const authUserId = "verified-supabase-user-id";
const discordId = "123456789012345678";
const approvedLink = { auth_user_id: authUserId, player_id: "andrew-sm", discord_user_id: discordId };
const decide = (overrides = {}) =>
  decidePlayerOwnership({
    requestedPlayerId: "andrew-sm",
    knownPlayerIds,
    verifiedAuthUserId: authUserId,
    verifiedDiscordId: discordId,
    approvedLink,
    ...overrides,
  });

test("accounts are disabled unless literal true is configured", () => {
  for (const value of [undefined, "", "false", "TRUE", "1", " true "]) {
    assert.equal(playerAccountsEnabled(value), false);
  }
  assert.equal(playerAccountsEnabled("true"), true);
});

test("verified user and approved binding to requested profile => owner", () => {
  assert.equal(decide(), "owner");
});

test("unknown profiles must never become owners", () => {
  assert.equal(decide({ requestedPlayerId: "fake-player" }), "invalid_profile");
});

test("an unauthenticated visitor cannot claim an approved profile", () => {
  assert.equal(decide({ verifiedAuthUserId: null }), "unauthenticated");
});

test("no approved link means no owner access", () => {
  assert.equal(decide({ approvedLink: null }), "unlinked");
});

test("another player's profile is forbidden", () => {
  assert.equal(decide({ requestedPlayerId: "another-player" }), "forbidden");
});

test("link tied to different Supabase user is forbidden", () => {
  assert.equal(decide({ approvedLink: { ...approvedLink, auth_user_id: "another-auth-user" } }), "forbidden");
});

test("link tied to unknown profile is forbidden", () => {
  assert.equal(decide({ approvedLink: { ...approvedLink, player_id: "missing-player" } }), "forbidden");
});

test("missing or invalid current Discord identity cannot own an approved profile", () => {
  assert.equal(decide({ verifiedDiscordId: null }), "forbidden");
  assert.equal(decide({ verifiedDiscordId: "" }), "forbidden");
});

test("changed Discord identity cannot reuse approved Supabase user link", () => {
  assert.equal(decide({ verifiedDiscordId: "999999999999999999" }), "forbidden");
  assert.equal(decide({ approvedLink: { ...approvedLink, discord_user_id: "999999999999999999" } }), "forbidden");
});
