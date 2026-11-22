// Checks the moai tabs of the core.grid value (core docs/spec/groups.md, tabs carry params; docs/spec/program-state.md, tabs carry
// program). A moai tab is a tab whose params name a program and a role of the moai group; the names of the tabs do not decide it.
import assert from "node:assert/strict";
import test from "node:test";
import { moaiTabs } from "../ui/moai-tabs.js";

const AGENTS = ["manager-spec", "manager-develop"];

const grid = {
  cards: [
    {
      id: 1,
      tabs: [
        { tab: 10, plugin: "terminal", title: "claude", active: true, params: { program: "claude", args: [], role: "manager-spec" }, program: { state: "working" } },
        { tab: 11, plugin: "terminal", title: "shell", active: false, params: null, program: null },
      ],
    },
    {
      id: 2,
      tabs: [
        { tab: 20, plugin: "terminal", title: "named like a moai tab", active: true, params: { program: "claude", args: [], role: "other" }, program: { state: "blocked" } },
        { tab: 21, plugin: "terminal", title: "idle moai", active: false, params: { program: "claude", args: [], role: "manager-develop" }, program: null },
      ],
    },
  ],
};

test("moaiTabs returns the tabs whose role is a moai agent, in workbench order, with their program state", () => {
  assert.deepEqual(moaiTabs(grid, AGENTS), [
    { tab: 10, title: "claude", role: "manager-spec", live: true, state: "working" },
    { tab: 21, title: "idle moai", role: "manager-develop", live: false, state: null },
  ]);
});

test("moaiTabs does not decide a moai tab by its title or by its plugin", () => {
  const rows = moaiTabs(grid, AGENTS);
  assert.equal(rows.some((row) => row.tab === 20), false, "a tab with a non-moai role is not a moai tab");
});

test("moaiTabs with no moai agent names returns no rows", () => {
  assert.deepEqual(moaiTabs(grid, []), []);
});

test("moaiTabs refuses a program that is neither null nor one of the three states, and names the tab", () => {
  const bad = { cards: [{ id: 3, tabs: [{ tab: 30, title: "x", params: { program: "claude", args: [], role: "manager-spec" }, program: { state: "sleeping" } }] }] };
  assert.throws(() => moaiTabs(bad, AGENTS), /tab 30 program state must be one of idle, working, blocked/);
});

test("moaiTabs refuses a tab without a program member", () => {
  const bad = { cards: [{ id: 4, tabs: [{ tab: 40, title: "x", params: { program: "claude", args: [], role: "manager-spec" } }] }] };
  assert.throws(() => moaiTabs(bad, AGENTS), /tab 40 has no program member/);
});

test("moaiTabs refuses a grid without a cards list", () => {
  assert.throws(() => moaiTabs({}, AGENTS), /core\.grid has no cards list/);
});
