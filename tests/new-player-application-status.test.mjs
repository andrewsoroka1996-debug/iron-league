import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const helperSource = readFileSync(resolve("lib/player-profile-request-display.ts"), "utf8");
const result = ts.transpileModule(helperSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  reportDiagnostics: true,
});
assert.equal(result.diagnostics?.length ?? 0, 0, "Display helper must transpile without diagnostics");
const { profileRequestStatusLabel, approvedPlayerProfileHref } = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputText).toString("base64")}`
);
const validId = `il-${"a1".repeat(16)}`;

test("render labels for all three database request states", () => {
  assert.equal(profileRequestStatusLabel("pending"), "На розгляді");
  assert.equal(profileRequestStatusLabel("approved"), "Схвалено");
  assert.equal(profileRequestStatusLabel("rejected"), "Відхилено");
  assert.equal(profileRequestStatusLabel("broken"), "Невідомий статус");
});

test("link to an approved player profile only when the generated id is valid", () => {
  assert.equal(approvedPlayerProfileHref({ status: "approved", approved_player_id: validId }), `/players/${validId}`);
  for (const status of ["pending", "rejected", "unknown"]) {
    assert.equal(approvedPlayerProfileHref({ status, approved_player_id: validId }), null);
  }
  for (const id of [null, undefined, "", "legacy-user", "il-abc", "il-" + "F".repeat(32),
    "il-" + "a".repeat(31) + "/", "il-" + "a".repeat(32) + "?redirect=/"])
  {
    assert.equal(approvedPlayerProfileHref({ status: "approved", approved_player_id: id }), null);
  }
});

test("UI consumes status and profile link while API supplies approved_player_id", () => {
  const ui = readFileSync(resolve("components/player-account/NewPlayerApplicationForm.tsx"), "utf8");
  const server = readFileSync(resolve("lib/player-profile-request-server.ts"), "utf8");
  assert.match(ui, /profileRequestStatusLabel\(request\.status\)/);
  assert.match(ui, /approvedPlayerProfileHref\(request\)/);
  assert.match(ui, /href=\{profileHref\}/);
  assert.match(ui, /request\.status === "pending"/); // Keep pending-form submission block.
  assert.match(server, /\.select\("id, desired_nickname, note, status, created_at, decided_at, decision_reason, approved_player_id"\)/);
});
