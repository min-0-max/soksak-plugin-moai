// Checks the declarations of plugin.json and package.json with literal expectations. The application validates plugin.json when it installs the release.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const manifest = JSON.parse(read("plugin.json"));
const pkg = JSON.parse(read("package.json"));

// The plugin declares only the fields of the plugin manifest that it uses at this stage: the surface adds its tab fields and its composition.
const FIELDS = ["id", "name", "description", "dependencies", "contributes", "mark", "icon", "surface", "programs"];

test("plugin.json declares only the manifest fields of this stage", () => {
  assert.deepEqual(Object.keys(manifest).filter((field) => !FIELDS.includes(field)), []);
  assert.equal(manifest.id, "moai");
  assert.equal(manifest.name, "moai");
});

test("plugin.json names the agents plugin and the files sidecar as its dependencies, each with a range of its versions", () => {
  assert.deepEqual(manifest.dependencies, { "@soksak/plugin-agents": "^0.0.1", "@soksak/sidecar-files": ">=0.0.12" });
});

test("plugin.json contributes one moai group to the extension point agents.makers, with a module inside the plugin", () => {
  assert.deepEqual(Object.keys(manifest.contributes), ["agents.makers"]);
  const items = manifest.contributes["agents.makers"];
  assert.equal(items.length, 1, "the plugin contributes one group");
  const [item] = items;
  // The item holds the fields of the point schema of agents (id and name) and the range, module and version fields of the contribution.
  assert.deepEqual(Object.keys(item).sort(), ["id", "module", "name", "range"]);
  assert.equal(item.id, "moai");
  assert.equal(item.name, "moai");
  // The range contains the version 0.0.1 of the point agents.makers that the agents plugin declares.
  assert.equal(item.range, "^0.0.1");
  // A module is a JavaScript path inside the plugin: relative, without a leading slash, an empty, . or .. segment, and ending in .js.
  assert.match(item.module, /^ui\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\.js$/);
  assert.equal(item.module.split("/").includes(".."), false, "the module leaves the plugin");
});

test("plugin.json declares the moai programs that the pages run by name, each as the plugin-folder path plugin:bin/moai and literal arguments", () => {
  assert.deepEqual(manifest.programs["config-load"], { program: "plugin:bin/moai", args: ["doctor", "config", "dump", "--format", "json"] });
  assert.deepEqual(manifest.programs["spec-audit"], { program: "plugin:bin/moai", args: ["spec", "audit", "--json", "--base-dir", "."] });
});

test("plugin.json extends no extension point, because the moai plugin is a contributor only", () => {
  assert.equal(manifest.extends, undefined);
});

test("package.json publishes the manifest that the release holds", () => {
  assert.ok(pkg.files.includes("plugin.json"), "package.json files does not list plugin.json");
});

test("package.json publishes the moai binary that the release build writes to bin/", () => {
  assert.ok(pkg.files.includes("bin"), "package.json files does not list bin, the folder of the moai binary");
});

test("package.json publishes the group module and the shipped index of the maker release", () => {
  assert.ok(pkg.files.includes("ui"), "package.json files does not list ui");
  assert.ok(pkg.files.includes("maker"), "package.json files does not list maker, the folder of the shipped index");
});
