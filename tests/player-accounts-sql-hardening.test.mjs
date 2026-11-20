import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root = process.cwd();
const read = (p) => readFileSync(path.join(root,p),"utf8");
const sql = read("sql/REVIEW-ONLY-iron-league-player-accounts-foundation.sql");

test("SQL is fail-closed until locally-generated legacy seed is reviewed", () => {
  assert.match(sql,/REVIEW ONLY/);
  assert.match(sql,/RAISE EXCEPTION 'STOP: legacy registry not seeded/);
  assert.match(sql,/IL_LEGACY_SNAPSHOT_PLACEHOLDER/);
  assert.match(sql,/CREATE TABLE public\.il_legacy_players/);
  assert.match(sql,/ALTER TABLE public\.il_legacy_players ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/REVOKE ALL ON public\.il_legacy_players FROM PUBLIC, anon, authenticated/);
});

test("database independently refuses unknown link targets and legacy collisions", () => {
  assert.match(sql,/CREATE FUNCTION public\.il_validate_discord_link_target/);
  assert.match(sql,/CREATE TRIGGER il_discord_link_target_exists/);
  assert.match(sql,/CREATE FUNCTION public\.il_reject_legacy_profile_collision/);
  assert.match(sql,/CREATE TRIGGER il_no_legacy_profile_collision/);
  assert.match(sql,/Target is not an existing legacy player/);
  assert.match(sql,/Legacy registry mismatch/);
  assert.match(sql,/normalize\(nickname, NFC\)/);
  assert.match(sql,/SECURITY DEFINER SET search_path = ''/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.admin_decide_player_discord_link/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.admin_approve_new_player_profile/);
});

test("existing approval RPC signature and server gates remain unchanged", () => {
  assert.match(sql,/p_legacy_ids text\[\]/);
  assert.match(sql,/p_legacy_nicknames text\[\]/);
  const api=read("lib/player-profile-request-server.ts");
  assert.match(api,/p_legacy_ids: legacyIds/);
  assert.match(api,/p_legacy_nicknames: legacyNames/);
  assert.match(api,/IRON_LEAGUE_NEW_PLAYER_APPROVAL_ENABLED === "true"/);
});

test("offline generator extracts AST literals and escapes SQL quotes safely", () => {
  const tmp=mkdtempSync(path.join(os.tmpdir(),"il-sql-test-"));
  try {
    const source=path.join(tmp,"players.ts");
    const target=path.join(tmp,"output.sql");
    writeFileSync(source,"export const players = [{id: 'first-id', nickname: 'Сокіл'}, {id: 'second-id', nickname: \"O'Hara $& $$\"}];\n");
    const r=spawnSync(process.execPath, ["scripts/generate-player-accounts-sql.mjs", "--source", source,
      "--template","sql/REVIEW-ONLY-iron-league-player-accounts-foundation.sql", "--output",target],
      {cwd:root, encoding:"utf8"});
    assert.equal(r.status,0,r.stderr || r.stdout);
    const contents=readFileSync(target,"utf8");
    assert.match(contents,/\('second-id', 'O''Hara \$& \$\$'\)/);
    // Must preserve the raw PostgreSQL dollar delimiter, not collapse $$ to $.
    assert.match(contents,/DO \$\$ BEGIN/);
    assert.match(contents,/END \$\$;/);
    assert.doesNotMatch(contents,/DO \$ BEGIN/);
    // JS string replacement must never interpolate the placeholder at "$&".
    assert.equal((contents.match(/IL_LEGACY_SNAPSHOT_PLACEHOLDER/g) ?? []).length, 0);
    assert.match(contents,/Snapshot rows: 2/);
    assert.doesNotMatch(contents,/IL_LEGACY_SNAPSHOT_PLACEHOLDER/);
    assert.match(contents,/CREATE FUNCTION public\.admin_decide_player_discord_link/);
    const repeat=spawnSync(process.execPath,["scripts/generate-player-accounts-sql.mjs","--source",source,
      "--output",target],{cwd:root,encoding:"utf8"});
    assert.notEqual(repeat.status,0,"Must never overwrite existing reviewed SQL");
  } finally {rmSync(tmp,{recursive:true,force:true});}
});
