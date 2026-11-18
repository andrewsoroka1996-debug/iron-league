import test from "node:test";
import assert from "node:assert/strict";
import { decideLinkRequest, parseAdminLinkAction } from "../lib/player-account-link-policy.ts";

const base = {
  enabled: true,
  verifiedUserId: "user-1",
  hasVerifiedDiscordIdentity: true,
  requestedPlayerId: "andrew-sm",
  knownPlayerIds: new Set(["andrew-sm", "other-player"]),
  existingApprovedLink: false,
  hasPendingRequest: false,
};

test("verified Discord user may request an existing profile, not own it", () => {
  assert.equal(decideLinkRequest(base), "allowed");
});
test("accounts disabled cannot create requests", () => {
  assert.equal(decideLinkRequest({ ...base, enabled: false }), "disabled");
});
test("unauthenticated visitor cannot create request", () => {
  assert.equal(decideLinkRequest({ ...base, verifiedUserId: null }), "unauthenticated");
});
test("other providers cannot create Discord link requests", () => {
  assert.equal(decideLinkRequest({ ...base, hasVerifiedDiscordIdentity: false }), "discord_required");
});
test("unknown player ID rejected", () => {
  assert.equal(decideLinkRequest({ ...base, requestedPlayerId: "not-in-roster" }), "invalid_profile");
});
test("already approved link blocks another request", () => {
  assert.equal(decideLinkRequest({ ...base, existingApprovedLink: true }), "already_linked");
});
test("one pending request per user", () => {
  assert.equal(decideLinkRequest({ ...base, hasPendingRequest: true }), "pending_exists");
});
test("admin list action only accepted exactly", () => {
  assert.deepEqual(parseAdminLinkAction({ action: "list" }), { action: "list" });
  assert.equal(parseAdminLinkAction({ action: "unknown" }), null);
});
test("approval requires valid UUID", () => {
  assert.deepEqual(parseAdminLinkAction({ action: "approve", requestId: "b0136af4-f070-4bd5-b015-70d8c30ee4e3" }), {
    action: "approve", requestId: "b0136af4-f070-4bd5-b015-70d8c30ee4e3", reason: null,
  });
  assert.equal(parseAdminLinkAction({ action: "approve", requestId: "bad" }), null);
});
test("rejection requires meaningful reason", () => {
  assert.equal(parseAdminLinkAction({ action: "reject", requestId: "b0136af4-f070-4bd5-b015-70d8c30ee4e3", reason: "no" }), null);
  assert.equal(parseAdminLinkAction({ action: "reject", requestId: "b0136af4-f070-4bd5-b015-70d8c30ee4e3", reason: "Недостатньо підтверджень" })?.action, "reject");
});
