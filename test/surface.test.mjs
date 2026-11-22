// Checks the surface declaration of plugin.json and its page with literal expectations. The application validates plugin.json when it installs the release.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const manifest = JSON.parse(read("plugin.json"));
const pkg = JSON.parse(read("package.json"));

test("plugin.json shows the moai surface as a view of its own page, with no document region and no web server", () => {
  assert.deepEqual(manifest.surface, {
    composition: {
      kind: "view",
      page: "ui/specs.html",
    },
  });
});

test("the surface names its tab with a mark and an icon of 16x16 SVG elements", () => {
  assert.equal(manifest.mark, "moai");
  assert.equal(typeof manifest.icon, "string");
  assert.notEqual(manifest.icon.trim(), "", "the icon is empty");
  // The icon holds SVG elements only: the view box and the root element belong to the surface, and no script or event attribute is allowed.
  assert.doesNotMatch(manifest.icon, /<svg|<script|\son[a-z]+=/i);
});

test("the surface page is a relative path inside the plugin that the release ships", () => {
  const page = manifest.surface.composition.page;
  assert.match(page, /^ui\/[a-z0-9-]+\.html$/);
  assert.equal(page.split("/").includes(".."), false, "the page leaves the plugin");
  assert.ok(existsSync(new URL(`../${page}`, import.meta.url)), `${page} does not exist`);
  assert.ok(pkg.files.includes("ui"), "package.json files does not ship ui");
});

test("the surface page loads its module from the plugin and holds no inline script", () => {
  const html = read(manifest.surface.composition.page);
  assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)/i, "the page holds an inline script");
  assert.match(html, /<script type="module" src="\.\/specs\.js"><\/script>/);
});

test("the page modules hold no timer, polling interval or timeout: the page updates from events only", () => {
  const TIMERS = /\b(?:setInterval|setTimeout|setImmediate|requestAnimationFrame|requestIdleCallback)\s*\(/;
  for (const file of ["ui/specs.js", "ui/specs-model.js"]) {
    assert.doesNotMatch(read(file), TIMERS, `${file} starts a timer; the page must update from the files sidecar events, not from a timer`);
  }
});
