// Checks the edit of one config section file: the YAML document keeps its other keys and comments, and the write requests
// are the write operation of the files sidecar (core docs/spec/sidecars.md, `write` with `expect`).
import assert from "node:assert/strict";
import test from "node:test";
import { sectionPath, setSectionValue, sectionWriteReply, sectionWriteRequest } from "../ui/section-edit-model.js";

test("sectionPath names the section file of the moai configuration", () => {
  assert.equal(sectionPath("quality"), ".moai/config/sections/quality.yaml");
});

test("setSectionValue changes one key and keeps the other keys and the comments", () => {
  const before = "# quality section\nquality:\n  test_coverage_target: 85 # percent\n  development_mode: tdd\n";
  const after = setSectionValue(before, ["quality", "test_coverage_target"], 90);
  assert.match(after, /# quality section/);
  assert.match(after, /test_coverage_target: 90 # percent/);
  assert.match(after, /development_mode: tdd/);
});

test("setSectionValue adds a missing key under its section", () => {
  assert.equal(setSectionValue("", ["quality", "test_coverage_target"], 90), "quality:\n  test_coverage_target: 90\n");
});

test("setSectionValue refuses text that is not YAML and names the section", () => {
  assert.throws(() => setSectionValue("quality: [unclosed\n", ["quality", "test_coverage_target"], 90), /quality\.yaml: YAML/);
});

test("sectionWriteRequest writes the whole section text in place, with the version that it expects", () => {
  assert.deepEqual(sectionWriteRequest("w-1", "quality", "quality:\n", "abc123"), {
    operation: "write",
    id: "w-1",
    path: ".moai/config/sections/quality.yaml",
    text: "quality:\n",
    expect: "abc123",
    bom: false,
  });
});

test("sectionWriteReply returns the version of the written bytes, and throws the sidecar error text", () => {
  assert.equal(sectionWriteReply({ id: "w-1", version: "def456" }), "def456");
  assert.throws(() => sectionWriteReply({ id: "w-1", error: "write refused: version changed" }), /write refused: version changed/);
});
