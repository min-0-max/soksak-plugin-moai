// Checks the declarations of plugin.json and package.json with literal expectations. The application validates plugin.json when it installs the release.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const manifest = JSON.parse(read("plugin.json"));
const pkg = JSON.parse(read("package.json"));

// The plugin declares only the fields of the plugin manifest that it uses at this stage.
const FIELDS = ["id", "name", "description", "dependencies", "contributes"];

test("plugin.json declares only the manifest fields of this stage", () => {
  assert.deepEqual(Object.keys(manifest).filter((field) => !FIELDS.includes(field)), []);
  assert.equal(manifest.id, "moai");
  assert.equal(manifest.name, "moai");
});

test("plugin.json names the agents plugin as its only dependency, with a range of its versions", () => {
  assert.deepEqual(manifest.dependencies, { agents: "^0.0.1" });
});

test("plugin.json contributes one moai group to the extension point agents.makers, with a module inside the plugin", () => {
  assert.deepEqual(Object.keys(manifest.contributes), ["agents.makers"]);
  const items = manifest.contributes["agents.makers"];
  assert.equal(items.length, 1, "the plugin contributes one group");
  const [item] = items;
  assert.deepEqual(Object.keys(item).sort(), ["module", "range"]);
  assert.equal(item.range, "^0.0.1");
  // A module is a JavaScript path inside the plugin: relative, without a leading slash, an empty, . or .. segment, and ending in .js.
  assert.match(item.module, /^ui\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\.js$/);
  assert.equal(item.module.split("/").includes(".."), false, "the module leaves the plugin");
});

test("plugin.json extends no extension point, because the moai plugin is a contributor only", () => {
  assert.equal(manifest.extends, undefined);
});

test("package.json publishes the manifest that the release holds", () => {
  assert.ok(pkg.files.includes("plugin.json"), "package.json files does not list plugin.json");
});
