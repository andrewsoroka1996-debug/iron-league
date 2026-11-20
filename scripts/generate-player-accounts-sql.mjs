#!/usr/bin/env node
/**
 * OFFLINE ONLY. Builds a review-only SQL artifact from the current data/players.ts.
 * Does NOT connect to Supabase, execute SQL, modify the source file, or set env flags.
 * Uses TypeScript AST. No eval/regex parsing of source code.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd();
function valueFor(args, flag, fallback) {
  const i = args.indexOf(flag);
  if (i === -1) return fallback;
  if (i + 1 >= args.length || args[i + 1].startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return args[i + 1];
}
const sourceName = valueFor(process.argv.slice(2), "--source", "data/players.ts");
const templateName = valueFor(process.argv.slice(2), "--template", "sql/REVIEW-ONLY-iron-league-player-accounts-foundation.sql");
const outputName = valueFor(process.argv.slice(2), "--output", "sql/REVIEW-ONLY-iron-league-player-accounts-prepared.sql");
const sourcePath = resolve(root, sourceName);
const templatePath = resolve(root, templateName);
const outputPath = resolve(root, outputName);
if (templatePath === outputPath || sourcePath === outputPath) {
  throw new Error("Refusing to overwrite SQL template or source registry");
}
const sourceBytes = readFileSync(sourcePath);
const sourceText = sourceBytes.toString("utf8");
const ast = ts.createSourceFile(sourceName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const declarations = [];
for (const stmt of ast.statements) {
  if (!ts.isVariableStatement(stmt)) continue;
  for (const decl of stmt.declarationList.declarations) {
    if (ts.isIdentifier(decl.name) && decl.name.text === "players") declarations.push(decl);
  }
}
if (declarations.length !== 1 || !ts.isArrayLiteralExpression(declarations[0].initializer)) {
  throw new Error("Expected exactly one const players = [ ... ] array in data/players.ts");
}
const rows = [];
const seenIds = new Set();
for (const [index, element] of declarations[0].initializer.elements.entries()) {
  if (!ts.isObjectLiteralExpression(element)) throw new Error(`Unexpected player expression at index ${index}`);
  const data = {};
  for (const member of element.properties) {
    if (!ts.isPropertyAssignment(member)) continue;
    const key = ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) ? member.name.text : null;
    if (key !== "id" && key !== "nickname") continue;
    if (!(ts.isStringLiteral(member.initializer) || ts.isNoSubstitutionTemplateLiteral(member.initializer))) {
      throw new Error(`Nonliteral ${key} at player index ${index}`);
    }
    data[key] = member.initializer.text;
  }
  if (typeof data.id !== "string" || data.id.length < 1 || data.id.length > 128 ||
      typeof data.nickname !== "string" || data.nickname.length < 1) {
    throw new Error(`Invalid ID or nickname at player index ${index}`);
  }
  if (seenIds.has(data.id.toLowerCase())) throw new Error(`Duplicate legacy player ID: ${data.id}`);
  seenIds.add(data.id.toLowerCase());
  rows.push(data);
}
if (!rows.length) throw new Error("Refusing to generate an empty legacy registry");
const quote = (s) => "'" + s.replaceAll("'", "''") + "'";
const tableRows = rows.map((row) => `  (${quote(row.id)}, ${quote(row.nickname)})`).join(",\n");
const seed = `-- VERIFIED OFFLINE SOURCE: ${sourceName}\n` +
  `-- Source SHA256: ${createHash("sha256").update(sourceBytes).digest("hex")}\n` +
  `-- Snapshot rows: ${rows.length}; review against data/players.ts before use.\n` +
  `INSERT INTO public.il_legacy_players(id, nickname) VALUES\n${tableRows};\n` +
  `DO $$ BEGIN\n  IF (SELECT count(*) FROM public.il_legacy_players) <> ${rows.length} THEN\n` +
  `    RAISE EXCEPTION 'STOP: legacy registry row count mismatch';\n  END IF;\nEND $$;`;
const template = readFileSync(templatePath, "utf8");
const placeholder = "DO $$ BEGIN RAISE EXCEPTION 'STOP: legacy registry not seeded; generate a reviewed SQL snapshot first'; END $$; -- IL_LEGACY_SNAPSHOT_PLACEHOLDER";
if (template.split(placeholder).length !== 2) throw new Error("Expected exactly one guarded seed placeholder");
const result = template.replace(placeholder, seed);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, result, { encoding: "utf8", flag: "wx" });
console.log(`REVIEW-ONLY SQL generated: ${outputPath}`);
console.log(`Legacy rows: ${rows.length}`);
console.log("No SQL executed. Do not run the generated file in Production before separate security review.");
