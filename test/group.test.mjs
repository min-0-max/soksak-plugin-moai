// Checks the group module with a release-shaped data object: agents, skills and files as the release build writes maker/index.js.
import assert from "node:assert/strict";
import test from "node:test";
import { groupFrom } from "../src/group.js";

const MANAGER_SPEC = ".claude/agents/moai/manager-spec.md";
const MANAGER_DEVELOP = ".claude/agents/moai/manager-develop.md";
const RUN = ".claude/skills/moai-run/SKILL.md";

function index(overrides = {}) {
  return {
    agents: [
      { name: "manager-spec", path: MANAGER_SPEC, cli: "claude", model: "opus" },
      { name: "manager-develop", path: MANAGER_DEVELOP, cli: "claude" },
    ],
    skills: [".claude/skills/moai-run"],
    files: [
      { path: MANAGER_SPEC, text: "---\nname: manager-spec\n---\nSPEC body\n" },
      { path: MANAGER_DEVELOP, text: "---\nname: manager-develop\n---\n" },
      { path: RUN, text: "---\nname: moai-run\n---\n" },
      { path: ".claude/skills/moai-run/extra.md", text: "extra\n" },
    ],
    ...overrides,
  };
}

test("the group returns the files of the index, as project paths with their text", () => {
  const group = groupFrom(index());
  assert.deepEqual(group.files, index().files);
});

test("the group lists its agents with the model kept, and every agent path names an entry of files", () => {
  const group = groupFrom(index());
  assert.deepEqual(group.agents, [
    { name: "manager-spec", path: MANAGER_SPEC, cli: "claude", model: "opus" },
    { name: "manager-develop", path: MANAGER_DEVELOP, cli: "claude" },
  ]);
  const paths = new Set(group.files.map((file) => file.path));
  for (const agent of group.agents) assert.ok(paths.has(agent.path), agent.path);
});

test("the group refuses an agent path that names no entry of files, and names the agent field", () => {
  const data = index({ files: index().files.filter((file) => file.path !== MANAGER_DEVELOP) });
  assert.throws(() => groupFrom(data), /agents\[1\]\.path/);
});

test("the group refuses a file outside the project folders, and names the file", () => {
  const data = index({ files: [...index().files, { path: "src/app.md", text: "x" }] });
  assert.throws(() => groupFrom(data), /files\[4\]\.path.*src\/app\.md/);
});

test("the group refuses a repeated file path", () => {
  const data = index({ files: [...index().files, { path: RUN, text: "again" }] });
  assert.throws(() => groupFrom(data), /files\[4\]\.path.*repeats/);
});

test("the group refuses a file entry without text", () => {
  const data = index({ files: [{ path: RUN }] });
  assert.throws(() => groupFrom(data), /files\[0\]\.text/);
});

test("a skill folder must hold files of the index, and a path outside .claude/skills is refused", () => {
  assert.throws(() => groupFrom(index({ skills: ["skills/moai-run"] })), /skills\[0\]/);
});

test("the group declares the moai identity, the claude-only CLI, the home variable, the bin path and the project folders", () => {
  const group = groupFrom(index());
  assert.equal(group.id, "moai");
  assert.equal(group.name, "moai");
  assert.equal(group.plugin, "plugin");
  assert.deepEqual(group.clis, ["claude"]);
  assert.deepEqual(group.variables, { MOAI_HOME: "{home}/.moai" });
  assert.deepEqual(group.path, ["bin"]);
  assert.deepEqual(group.folders, [".moai/", ".claude/"]);
  assert.equal(group.rules.length, 1);
  assert.equal(JSON.stringify(group).includes('"port"'), false);
});

test("the group refuses an agent model that is not a non-empty string, and names the field", () => {
  const data = index({ agents: [{ name: "x", path: MANAGER_SPEC, cli: "claude", model: 5 }] });
  assert.throws(() => groupFrom(data), /agents\[0\]\.model/);
});
