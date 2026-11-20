import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
const root = process.cwd();
const get = (p) => readFileSync(path.join(root, p), "utf8");

test("approval is a third independent server-only feature gate", () => {
  const server = get("lib/player-profile-request-server.ts");
  assert.match(server, /process\.env\.IRON_LEAGUE_NEW_PLAYER_APPROVAL_ENABLED === "true"/);
  assert.match(server, /return profileApplicationsEnabled\(\) &&/);
  assert.match(server, /input\.action === "approve" && !playerApprovalEnabled\(\)/);
  assert.match(server, /adminPasswordValid\(input\.password\)/);
  const page = get("app/admin/player-accounts/page.tsx");
  assert.match(page, /allowApprovals=\{playerApprovalEnabled\(\)\}/);
});

test("approve ignores browser user IDs and verifies Discord from admin auth and SQL", () => {
  const server = get("lib/player-profile-request-server.ts");
  assert.match(server, /auth\.admin\.getUserById\(pending\.auth_user_id\)/);
  assert.match(server, /verifiedDiscordId !== expectedDiscordId/);
  assert.match(server, /p_legacy_ids: legacyIds/);
  assert.match(server, /p_legacy_nicknames: legacyNames/);
  assert.match(server, /client\.rpc\(APPROVAL_RPC/);
  assert.doesNotMatch(server, /auth_user_id:\s*input\./);
});

test("SQL performs atomic locked profile creation, Discord linking and decision", () => {
  const sql = get("sql/REVIEW-ONLY-iron-league-player-accounts-foundation.sql");
  assert.match(sql, /REVIEW ONLY/);
  assert.match(sql, /BEGIN;/);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /auth\.identities/);
  assert.match(sql, /provider_id/);
  assert.match(sql, /INSERT INTO public\.player_profiles/);
  assert.match(sql, /INSERT INTO public\.player_discord_links/);
  assert.match(sql, /approved_player_id = v_player_id/);
  assert.match(sql, /CREATE UNIQUE INDEX player_profiles_nickname_ci_unique/);
  assert.match(sql, /CHECK \(status IN \('pending','approved','rejected'\)\)/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.admin_approve_new_player_profile/);
  assert.match(sql, /FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /TO service_role;/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /SET search_path = ''/);
  assert.doesNotMatch(sql, /GRANT (?:ALL|UPDATE|DELETE) ON public\.player_discord_links TO authenticated/);
  assert.match(sql, /CREATE POLICY applicant_reads_only_own_profile_requests/);
  assert.match(sql, /CREATE POLICY applicant_inserts_only_own_pending_profile_request/);
});

test("admin UI requires typed nickname confirmation and numeric Discord ID", () => {
  const ui = get("components/admin/NewProfileRequestsAdminPanel.tsx");
  assert.match(ui, /window\.prompt/);
  assert.match(ui, /allowApprovals && <button/);
  assert.match(ui, /confirmedNickname !== request\.nickname/);
  assert.match(ui, /expectedDiscordId: request\.discordId/);
  assert.match(ui, /Схвалити та створити профіль/);
  assert.doesNotMatch(ui, /localStorage|sessionStorage/);
});
