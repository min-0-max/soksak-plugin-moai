// Checks the SPEC list model with literal replies of the files sidecar: the list operation of core docs/spec/sidecars.md.
import assert from "node:assert/strict";
import test from "node:test";
import { listSpecsRequest, nextWatchPath, specIds, watchSpecsRequest } from "../ui/specs-model.js";

test("the list request names the specs folder of the project root relative to the root", () => {
  assert.deepEqual(listSpecsRequest("req-1"), { operation: "list", id: "req-1", path: ".moai/specs" });
});

test("specIds returns the SPEC folders in name order and ignores files and other folders", () => {
  const reply = {
    id: "req-1",
    entries: [
      { name: "SPEC-WEB-CONSOLE-011", directory: true },
      { name: "README.md", directory: false },
      { name: "SPEC-TODO-001", directory: true },
      { name: "notes", directory: true },
      { name: "SPEC-OLD-002", directory: false },
    ],
  };
  assert.deepEqual(specIds(reply), ["SPEC-TODO-001", "SPEC-WEB-CONSOLE-011"]);
});

test("specIds throws the error text of a failed reply", () => {
  assert.throws(() => specIds({ id: "req-1", error: "root/.moai/specs: no such file" }), /root\/\.moai\/specs: no such file/);
});

test("specIds refuses a reply without entries and names the field", () => {
  assert.throws(() => specIds({ id: "req-1" }), /entries/);
});

test("the watch request names one path of the watch chain of the project root, relative to the root", () => {
  assert.deepEqual(watchSpecsRequest("w-1", ".moai"), { operation: "watch", id: "w-1", paths: [".moai"] });
});

test("nextWatchPath walks the chain from the specs folder to the project root, and ends at the root", () => {
  assert.equal(nextWatchPath(".moai/specs"), ".moai");
  assert.equal(nextWatchPath(".moai"), "");
  assert.equal(nextWatchPath(""), null);
});

test("nextWatchPath refuses a path outside the chain", () => {
  assert.throws(() => nextWatchPath("other"), /not in the watch chain/);
});
