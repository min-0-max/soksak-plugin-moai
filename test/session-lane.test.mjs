// Checks the lane that assigns a moai record to a moai tab. Sources: moai-adk internal/session/registry.go (Entry, the members of
// active-sessions.json) and internal/session/session_pid.go (resolveSessionPID: the agent pid of a session); core docs/spec/process-list.md
// (the foreground {group, pid} of a terminal tab). A record that matches no entry or no tab stays in the rows as unassigned.
import assert from "node:assert/strict";
import test from "node:test";
import { activeEntries, laneRows } from "../ui/session-lane.js";

const ENTRIES = JSON.stringify([
  { session_id: "s-1", spec_id: "SPEC-A-001", phase: "run", started_at: "2026-11-22T00:00:00Z", last_heartbeat: "2026-11-22T00:00:05Z", pid: 4100, host: "h", cwd: "/p" },
  { session_id: "s-2", spec_id: "SPEC-B-002", phase: "plan", started_at: "2026-11-22T00:00:00Z", last_heartbeat: "2026-11-22T00:00:05Z", pid: 4200, host: "h", cwd: "/p" },
]);

const TABS = [
  { tab: 10, plugin: "terminal", title: "claude", foreground: { group: 4100, pid: 4100 } },
  { tab: 11, plugin: "term", title: "claude 2", foreground: null },
  { tab: 12, plugin: "terminal", title: "claude 3", foreground: { group: 9000, pid: 4300 } },
];

test("activeEntries reads the registry entries with their session id and pid", () => {
  const entries = activeEntries(ENTRIES);
  assert.equal(entries.length, 2);
  assert.deepEqual(entries[0], { sessionID: "s-1", pid: 4100 });
});

test("activeEntries refuses a file that is not an array, and an entry without a session id, with the field named", () => {
  assert.throws(() => activeEntries("{}"), /active-sessions\.json must be an array/);
  assert.throws(() => activeEntries(JSON.stringify([{ pid: 1 }])), /active-sessions\.json\[0\]\.session_id must be a non-empty string/);
});

test("laneRows assigns each record to the moai tab whose foreground pid is the entry pid, by the tab's plugin", () => {
  const records = [{ name: "goal/s-1.json", value: { goal: 1 }, error: null }];
  assert.deepEqual(laneRows(records, activeEntries(ENTRIES), TABS), [
    { record: "goal/s-1.json", sessionID: "s-1", assigned: { tab: 10, plugin: "terminal", title: "claude" }, reason: null, value: { goal: 1 }, error: null },
  ]);
});

test("laneRows assigns a tab whose foreground group is the entry pid", () => {
  const tabs = [{ tab: 13, plugin: "term", title: "g", foreground: { group: 4200, pid: 4201 } }];
  const [row] = laneRows([{ name: "todo/s-2.json", value: [], error: null }], activeEntries(ENTRIES), tabs);
  assert.deepEqual(row.assigned, { tab: 13, plugin: "term", title: "g" });
});

test("laneRows keeps a record with no registry entry as unassigned, with the reason", () => {
  const [row] = laneRows([{ name: "goal/s-9.json", value: {}, error: null }], activeEntries(ENTRIES), TABS);
  assert.equal(row.assigned, null);
  assert.equal(row.reason, "no active-sessions entry for session s-9");
});

test("laneRows keeps a record whose entry has no matching tab as unassigned, with the pid named", () => {
  const [row] = laneRows([{ name: "goal/s-2.json", value: {}, error: null }], activeEntries(ENTRIES), TABS);
  assert.equal(row.assigned, null);
  assert.equal(row.reason, "no moai tab has the foreground process pid 4200");
});

test("laneRows assigns a record by its file name, and keeps the error of a record that is not JSON", () => {
  const rows = laneRows([{ name: "goal/s-1.json", value: null, error: "goal/s-1.json: not JSON: x" }], activeEntries(ENTRIES), TABS);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].error, "goal/s-1.json: not JSON: x");
  assert.deepEqual(rows[0].assigned, { tab: 10, plugin: "terminal", title: "claude" });
});

test("laneRows refuses a pid that two tabs hold", () => {
  const tabs = [
    { tab: 1, plugin: "terminal", title: "a", foreground: { group: 4100, pid: 4100 } },
    { tab: 2, plugin: "terminal", title: "b", foreground: { group: 4100, pid: 4100 } },
  ];
  assert.throws(() => laneRows([{ name: "goal/s-1.json", value: {}, error: null }], activeEntries(ENTRIES), tabs), /pid 4100 is the foreground of tabs 1 and 2/);
});
