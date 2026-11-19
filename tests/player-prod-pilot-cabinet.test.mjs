import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PILOT_CABINET_PLAYER_ID,
  isSingleApprovedPilotDiscordIdentity,
} from "../lib/player-prod-pilot-cabinet-access.ts";

const approved = "123456789012345678";
const another = "223456789012345678";

test("pilot cabinet targets Andrew_SM's canonical player ID", () => {
  assert.equal(PILOT_CABINET_PLAYER_ID, "andrew-sm");
});
test("exactly one approved canonical Discord ID is permitted", () => {
  assert.equal(isSingleApprovedPilotDiscordIdentity(approved, new Set([approved])), true);
});
test("no authenticated Discord identity is rejected", () => {
  assert.equal(isSingleApprovedPilotDiscordIdentity(null, new Set([approved])), false);
  assert.equal(isSingleApprovedPilotDiscordIdentity(undefined, new Set([approved])), false);
});
test("wrong Discord identity is rejected", () => {
  assert.equal(isSingleApprovedPilotDiscordIdentity(another, new Set([approved])), false);
});
test("two allowlisted Discord identities are rejected even if one matches", () => {
  assert.equal(isSingleApprovedPilotDiscordIdentity(approved, new Set([approved, another])), false);
});
test("no allowlisted identities are rejected", () => {
  assert.equal(isSingleApprovedPilotDiscordIdentity(approved, new Set()), false);
});
test("noncanonical and short Discord identity strings are rejected", () => {
  assert.equal(isSingleApprovedPilotDiscordIdentity("andrew_sm_", new Set(["andrew_sm_"])), false);
  assert.equal(isSingleApprovedPilotDiscordIdentity("123", new Set(["123"])), false);
});
test("cabinet page has an explicit server-side production pilot gate", () => {
  const code = readFileSync(new URL("../app/auth/discord-pilot/cabinet/page.tsx", import.meta.url), "utf8");
  assert.match(code, /productionPilotEnabled\(policyInput\)/);
  assert.match(code, /supabase\.auth\.getUser\(\)/);
  assert.match(code, /isSingleApprovedPilotDiscordIdentity\(discordId, allowedIds\)/);
  assert.match(code, /allowedIds\.size !== 1/);
});
test("cabinet reuses only read-only match component and loader", () => {
  const code = readFileSync(new URL("../app/auth/discord-pilot/cabinet/page.tsx", import.meta.url), "utf8");
  assert.match(code, /loadSeason4DirectPlayerMatchGroups\(PILOT_CABINET_PLAYER_ID\)/);
  assert.match(code, /PlayerAccountMatches/);
  assert.doesNotMatch(code, /PlayerAccountPanel|PlayerResultSubmissionForm|supabaseAdmin|\.insert\(|\.update\(|\.delete\(/);
});
