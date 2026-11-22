// Checks the surface declaration of plugin.json and its page with literal expectations. The application validates plugin.json when it installs the release.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const manifest = JSON.parse(read("plugin.json"));
const pkg = JSON.parse(read("package.json"));

test("plugin.json shows the moai web surface as a view of its own page with one native document region", () => {
  assert.deepEqual(manifest.surface, {
    composition: {
      kind: "view",
      page: "ui/web.html",
      regions: [{ name: "moai-web", kind: "document", input: "native" }],
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

test("the region names match the name syntax and are unique", () => {
  const names = manifest.surface.composition.regions.map((region) => region.name);
  assert.deepEqual(names, [...new Set(names)]);
  for (const name of names) assert.match(name, /^[a-z0-9][a-z0-9-]{0,63}$/);
});

test("the surface page is a relative path inside the plugin that the release ships", () => {
  const page = manifest.surface.composition.page;
  assert.match(page, /^ui\/[a-z0-9-]+\.html$/);
  assert.equal(page.split("/").includes(".."), false, "the page leaves the plugin");
  assert.ok(existsSync(new URL(`../${page}`, import.meta.url)), `${page} does not exist`);
  assert.ok(pkg.files.includes("ui"), "package.json files does not ship ui");
});

test("the surface page holds the element of its document region and no script", () => {
  const html = read(manifest.surface.composition.page);
  const regions = manifest.surface.composition.regions.map((region) => region.name);
  for (const name of regions) {
    const elements = html.match(new RegExp(`data-region="${name}"`, "g")) ?? [];
    assert.equal(elements.length, 1, `the page holds ${elements.length} elements of region ${name}`);
  }
  assert.doesNotMatch(html, /<script/i, "the page holds a script before the moai web controller exists");
});
