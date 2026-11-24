// Checks the group module with a release-shaped data object: the agents as the release build writes maker/index.js, each with its path in
// the maker folder (agents docs/spec/makers.md).
import assert from "node:assert/strict";
import test from "node:test";
import { groupFrom } from "../src/group.js";

const MANAGER_SPEC = ".claude/agents/moai/manager-spec.md";
const MANAGER_DEVELOP = ".claude/agents/moai/manager-develop.md";

function index(overrides = {}) {
  return {
    agents: [
      { name: "manager-spec", path: MANAGER_SPEC, cli: "claude", model: "opus" },
      { name: "manager-develop", path: MANAGER_DEVELOP, cli: "claude" },
    ],
    ...overrides,
  };
}

test("the group lists its agents with the model kept and their path in the maker folder", () => {
  assert.deepEqual(groupFrom(index()).agents, [
    { name: "manager-spec", path: MANAGER_SPEC, cli: "claude", model: "opus" },
    { name: "manager-develop", path: MANAGER_DEVELOP, cli: "claude" },
  ]);
});

test("the group refuses an agent path outside .claude/agents of the maker folder, and names the agent field", () => {
  for (const path of [".moai/agents/x.md", ".claude/agents/../x.md", "/abs/.claude/agents/x.md", ".claude/agents/x.txt"]) {
    assert.throws(() => groupFrom(index({ agents: [{ name: "x", path, cli: "claude" }] })), /agents\[0\]\.path .* is not a Markdown file under \.claude\/agents\/ of the maker folder/);
  }
});

test("the group refuses a data module of the earlier form, which held files and skills", () => {
  assert.throws(() => groupFrom(index({ files: [] })), /maker\/index\.js: files is not a member of the data module/);
  assert.throws(() => groupFrom(index({ skills: [] })), /maker\/index\.js: skills is not a member of the data module/);
});

test("the group declares the moai identity, the maker folder, the claude-only CLI, the variables and the project folders", () => {
  const group = groupFrom(index());
  assert.deepEqual(Object.keys(group).sort(), ["agents", "clis", "folders", "id", "name", "plugin", "rules", "variables"]);
  assert.equal(group.id, "moai");
  assert.equal(group.name, "moai");
  assert.equal(group.plugin, "plugin");
  assert.deepEqual(group.clis, ["claude"]);
  assert.deepEqual(group.variables, { MOAI_HOME: "{home}/.moai", MOAI_PLUGIN: "{plugin}" });
  assert.deepEqual(group.folders, [".moai/", ".claude/agent-memory/"]);
  assert.equal(group.rules.length, 1);
  assert.equal(JSON.stringify(group).includes('"port"'), false);
});

test("the group refuses an agent model that is not a non-empty string, and names the field", () => {
  const data = index({ agents: [{ name: "x", path: MANAGER_SPEC, cli: "claude", model: 5 }] });
  assert.throws(() => groupFrom(data), /agents\[0\]\.model/);
});
