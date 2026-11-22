// Checks the save flow of one section file: read, write with expect, the moai load run, and the restore of the previous text when
// the load fails. The files sidecar is a store that follows the write rules of core docs/spec/files.md (expect, changed on disk).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { saveSection } from "../ui/section-save.js";

const sha = (text) => createHash("sha256").update(text).digest("hex");

// A files sidecar store that answers read and write requests by id, and rejects a failure as the sidecar does.
function sidecarStore(files, { failWrite = 0 } = {}) {
  let writes = 0;
  const request = (makeBody) => {
    const body = makeBody(`req-${Math.random()}`);
    if (body.operation === "read") {
      const file = files.get(body.path);
      if (file === undefined) return Promise.reject(new Error(`${body.path}: no such file`));
      return Promise.resolve({ id: body.id, text: file.text, version: sha(file.text), newline: "lf", bom: false });
    }
    if (body.operation === "write") {
      writes += 1;
      if (writes === failWrite) return Promise.reject(new Error(`write refused: ${body.path}`));
      const file = files.get(body.path);
      if (file && body.expect !== sha(file.text)) return Promise.reject(new Error(`changed on disk: ${body.path}`));
      files.set(body.path, { text: body.text });
      return Promise.resolve({ id: body.id, version: sha(body.text) });
    }
    return Promise.reject(new Error(`unexpected operation ${body.operation}`));
  };
  return { request };
}

const PATH = ".moai/config/sections/quality.yaml";
const noCheck = () => {};
const BEFORE = "# quality\nquality:\n  test_coverage_target: 85 # percent\n  development_mode: tdd\n";

test("saveSection writes the value, runs the moai load and returns the version of the written text", async () => {
  const files = new Map([[PATH, { text: BEFORE }]]);
  const runs = [];
  const run = async (name) => {
    runs.push(name);
    return { code: 0, stdout: "{}", stderr: "", truncated: { stdout: false, stderr: false } };
  };
  const { version } = await saveSection({
    check: noCheck, section: "quality", path: ["quality", "test_coverage_target"], value: 90, request: sidecarStore(files).request, run,
  });
  assert.deepEqual(runs, ["config-load"]);
  assert.match(files.get(PATH).text, /test_coverage_target: 90 # percent/);
  assert.match(files.get(PATH).text, /development_mode: tdd/);
  assert.equal(version, sha(files.get(PATH).text));
});

test("saveSection restores the previous text and reports moai's error text when the load fails", async () => {
  const files = new Map([[PATH, { text: BEFORE }]]);
  const run = async () => ({ code: 1, stdout: "", stderr: "config: quality.development_mode must be tdd or ddd", truncated: { stdout: false, stderr: false } });
  await assert.rejects(
    saveSection({ check: noCheck, section: "quality", path: ["quality", "test_coverage_target"], value: 90, request: sidecarStore(files).request, run }),
    /quality\.development_mode must be tdd or ddd.*restored/s,
  );
  assert.equal(files.get(PATH).text, BEFORE);
});

test("saveSection names both failures when the restore also fails", async () => {
  const files = new Map([[PATH, { text: BEFORE }]]);
  const run = async () => ({ code: 1, stdout: "", stderr: "load failed", truncated: { stdout: false, stderr: false } });
  // The second write is the restore: it is refused, so the file keeps the new text and the error names both failures.
  await assert.rejects(
    saveSection({ check: noCheck, section: "quality", path: ["quality", "test_coverage_target"], value: 90, request: sidecarStore(files, { failWrite: 2 }).request, run }),
    /load failed.*restoring .*quality\.yaml also failed: write refused/s,
  );
});

test("saveSection refuses a run that ends by a signal, with the code null named", async () => {
  const files = new Map([[PATH, { text: BEFORE }]]);
  const run = async () => ({ code: null, stdout: "", stderr: "", truncated: { stdout: false, stderr: false } });
  await assert.rejects(
    saveSection({ check: noCheck, section: "quality", path: ["quality", "test_coverage_target"], value: 90, request: sidecarStore(files).request, run }),
    /signal/,
  );
  assert.equal(files.get(PATH).text, BEFORE);
});

test("saveSection writes nothing when the section file is missing", async () => {
  const files = new Map();
  await assert.rejects(
    saveSection({ check: noCheck, section: "quality", path: ["quality", "test_coverage_target"], value: 90, request: sidecarStore(files).request, run: async () => null }),
    /quality\.yaml: no such file/,
  );
  assert.equal(files.size, 0);
});

test("saveSection writes nothing when the check of the new text throws", async () => {
  const files = new Map([[PATH, { text: BEFORE }]]);
  const runs = [];
  await assert.rejects(
    saveSection({
      section: "quality", path: ["quality", "development_mode"], value: "waterfall",
      check: (text) => { if (text.includes("waterfall")) throw new Error("quality.yaml: quality.development_mode must be one of: ddd, tdd"); },
      request: sidecarStore(files).request, run: async (name) => { runs.push(name); return null; },
    }),
    /development_mode must be one of/,
  );
  assert.equal(files.get(PATH).text, BEFORE);
  assert.deepEqual(runs, []);
});
