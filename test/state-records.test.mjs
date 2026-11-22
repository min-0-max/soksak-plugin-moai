// Checks the watch set of the moai surface and the reading of the state records (.moai/state/todo, goal and verify). The records
// are shown by their file names; the record schema is not in any contract, so each record keeps its JSON value or its parse error.
import assert from "node:assert/strict";
import test from "node:test";
import { recordRows, STATE_FOLDERS } from "../ui/state-records.js";
import { listRequest, watchPathsOf, watchSpecsRequest, WATCH_CANDIDATES } from "../ui/specs-model.js";

test("the watch candidates are the moai folders the page lists, from the moai folder down to the state folders", () => {
  assert.deepEqual(WATCH_CANDIDATES, [".moai", ".moai/state", ".moai/specs", ".moai/state/todo", ".moai/state/goal", ".moai/state/verify"]);
});

test("watchPathsOf keeps the candidates that exist, in candidate order", () => {
  assert.deepEqual(watchPathsOf([".moai/specs", ".moai", ".moai/state/goal"]), [".moai", ".moai/specs", ".moai/state/goal"]);
});

test("watchPathsOf watches the project root when no candidate exists, so the creation of the moai folder is reported", () => {
  assert.deepEqual(watchPathsOf([]), [""]);
});

test("the watch request names the set of paths, relative to the root", () => {
  assert.deepEqual(watchSpecsRequest("w-1", [".moai", ".moai/specs"]), { operation: "watch", id: "w-1", paths: [".moai", ".moai/specs"] });
});

test("the list request names one path relative to the root", () => {
  assert.deepEqual(listRequest("l-1", ".moai/state/todo"), { operation: "list", id: "l-1", path: ".moai/state/todo" });
});

test("the state folders are the folders of the todo, goal and verify records", () => {
  assert.deepEqual(STATE_FOLDERS, { todo: ".moai/state/todo", goal: ".moai/state/goal", verify: ".moai/state/verify" });
});

test("recordRows reads each record as its JSON value under its file name", () => {
  assert.deepEqual(recordRows([{ name: "s1.json", text: "{\"lane\":\"queued\"}" }]), [
    { name: "s1.json", value: { lane: "queued" }, error: null },
  ]);
});

test("recordRows keeps a record whose read failed, with the read error, and does not parse it", () => {
  assert.deepEqual(recordRows([{ name: "s3.json", text: null, readError: "no such file" }]), [
    { name: "s3.json", value: null, error: "s3.json: no such file" },
  ]);
});

test("recordRows keeps a record whose text is not JSON, with its parse error, and drops no record", () => {
  const [bad, good] = recordRows([{ name: "s1.json", text: "{" }, { name: "s2.json", text: "[1]" }]);
  assert.equal(bad.name, "s1.json");
  assert.equal(bad.value, null);
  assert.match(bad.error, /s1\.json: not JSON/);
  assert.deepEqual(good, { name: "s2.json", value: [1], error: null });
});
