// The seed plan: which files of the release seed the project lacks, how each one is named and rendered, and the requests of the
// files sidecar that write them. The planner is pure; the page reads the project and the sidecar replies.
import assert from "node:assert/strict";
import test from "node:test";
import {
  createFolderRequest,
  localeOf,
  planSeed,
  projectNameOf,
  renderSeedFile,
  seedDirectories,
  targetPath,
  writeRequest,
} from "../ui/seed-plan.js";

const FILES = ["README.md", "config/sections/user.yaml.tmpl", "config/sections/language.yaml.tmpl", "status_line.sh.tmpl"];

test("targetPath names a seed file under .moai and strips the .tmpl suffix", () => {
  assert.equal(targetPath("config/sections/user.yaml.tmpl"), ".moai/config/sections/user.yaml");
  assert.equal(targetPath("README.md"), ".moai/README.md");
});

test("seedDirectories lists each directory of the seed under .moai, shallowest first", () => {
  assert.deepEqual(seedDirectories(FILES), [".moai", ".moai/config", ".moai/config/sections"]);
});

test("planSeed writes every seed file the project lacks and keeps the ones it has", () => {
  const plan = planSeed({ files: FILES, existing: [".moai/README.md"] });
  assert.deepEqual(plan.kept, [".moai/README.md"]);
  assert.deepEqual(plan.writes, ["config/sections/user.yaml.tmpl", "config/sections/language.yaml.tmpl", "status_line.sh.tmpl"]);
});

test("a second run over a complete seed writes nothing", () => {
  const complete = FILES.map(targetPath);
  const plan = planSeed({ files: FILES, existing: complete });
  assert.deepEqual(plan.writes, []);
  assert.deepEqual(plan.kept, complete);
});

test("renderSeedFile renders a template with the values and names its target", () => {
  const rendered = renderSeedFile("config/sections/user.yaml.tmpl", 'name: "{{.ProjectName}}"\n', { ProjectName: "soksak" });
  assert.deepEqual(rendered, { path: ".moai/config/sections/user.yaml", text: 'name: "soksak"\n' });
});

test("renderSeedFile copies a file without the suffix unchanged", () => {
  assert.deepEqual(renderSeedFile("README.md", "# {{not a template}}\n", {}), { path: ".moai/README.md", text: "# {{not a template}}\n" });
});

test("localeOf takes the language of a navigator language tag and refuses an empty tag", () => {
  assert.equal(localeOf("ko-KR"), "ko");
  assert.equal(localeOf("zh-Hans-CN"), "zh");
  assert.throws(() => localeOf(""), /navigator language is empty/);
});

test("projectNameOf is the last folder of the project root", () => {
  assert.equal(projectNameOf("/Users/someone/work/soksak/"), "soksak");
  assert.throws(() => projectNameOf(""), /project root is empty/);
});

test("writeRequest creates a new file with expect null, which the files sidecar requires", () => {
  const request = writeRequest("write-1", ".moai/README.md", "# moai project\n");
  assert.deepEqual(request, { operation: "write", id: "write-1", path: ".moai/README.md", text: "# moai project\n", bom: false, expect: null });
});

test("createFolderRequest names a folder of the project", () => {
  assert.deepEqual(createFolderRequest("folder-1", ".moai/config"), { operation: "createFolder", id: "folder-1", path: ".moai/config" });
});
