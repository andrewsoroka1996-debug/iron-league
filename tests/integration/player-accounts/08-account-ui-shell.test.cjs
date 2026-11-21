"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "../../..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("account and account-admin get an isolated theme; global layout and CSS unchanged", () => {
  const account = read("app/account/layout.tsx");
  const admin = read("app/admin/player-accounts/layout.tsx");
  const css = read("app/account/il-account-theme.css");
  assert.match(account, /AccountExperienceFrame/);
  assert.match(admin, /AccountExperienceFrame admin/);
  assert.match(css, /il-preview-root/);
  assert.doesNotMatch(css, /^\s*(?:html|body)(?:\s|,|\{)/m);
  assert.doesNotMatch(css, /\.il-landing(?:-|\b)/);
});

test("account navigation excludes fake demo routes, and locked application links are conditional", () => {
  const frame = read("components/account-ui/AccountExperienceFrame.tsx");
  assert.doesNotMatch(frame, /demo-player|il-demo|\/auth-test|\/auth\/discord-pilot|ЛОКАЛЬНИЙ ПЕРЕГЛЯД/);
  assert.match(frame, /if \(historicalApplicationsAvailable\)/);
  assert.match(frame, /if \(newApplicationsAvailable\)/);
  assert.match(frame, /if \(admin\)/);
  const layout = read("app/account/layout.tsx");
  assert.match(layout, /existingPlayerApplicationsEnabled/);
  assert.match(layout, /profileApplicationsEnabled\(\)/);
});

test("mobile menu preserves the approved accessible toggle and mobile grid", () => {
  const frame = read("components/account-ui/AccountExperienceFrame.tsx");
  const css = read("app/account/il-account-theme.css");
  assert.match(frame, /aria-expanded=\{mobileMenuOpen\}/);
  assert.match(frame, /aria-controls="il-account-ui-section-links"/);
  assert.match(frame, /usePathname/);
  assert.match(css, /\.il-preview-tabs-inner\.is-open/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test("no login, approval, RLS, privileged routes or historical profile pages are replaced", () => {
  const account = read("app/account/page.tsx");
  assert.match(account, /loadHubState/);
  assert.match(account, /getDiscordProviderId/);
  assert.match(account, /PublicDiscordSignOut/);
  assert.match(account, /existingApplicationsAvailable/);
  const admin = read("app/admin/player-accounts/page.tsx");
  assert.match(admin, /playerAccountsEnabled/);
});
