// The page seed of the moai group, run against a real folder. The request function replies the way the files sidecar does for
// the operations the seed uses: list, read, createFolder and write (which needs an expect value and refuses an existing path).
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { seedMoaiProject } from "../ui/seed.js";

const INDEX = { version: "v3.1.2", files: ["README.md", "config/sections/language.yaml.tmpl", "config/sections/user.yaml.tmpl"] };
const SEED = {
  "README.md": "# moai project\n",
  "config/sections/language.yaml.tmpl": 'conversation: "{{.ConversationLanguage}}"\n',
  "config/sections/user.yaml.tmpl": 'name: "{{.ProjectName}}"\n',
};

// The files sidecar replies to the operations of the seed, on a real folder under root.
function folderRequest(root) {
  const operations = [];
  let counter = 0;
  const request = async (makeBody) => {
    const body = makeBody(`r${(counter += 1)}`);
    operations.push(`${body.operation} ${body.path ?? ""}`.trim());
    switch (body.operation) {
      case "list":
        return { id: body.id, entries: readdirSync(join(root, body.path), { withFileTypes: true }).map((e) => ({ name: e.name, directory: e.isDirectory() })) };
      case "read":
        return { id: body.id, text: readFileSync(join(root, body.path), "utf8"), version: "", newline: "none", bom: false };
      case "createFolder":
        mkdirSync(join(root, body.path), { recursive: true });
        return { id: body.id };
      case "write":
        if (body.expect !== null) throw new Error("write requires expect: a version or null");
        if (existsSync(join(root, body.path))) throw new Error(`exists: ${body.path}`);
        writeFileSync(join(root, body.path), body.text);
        return { id: body.id, version: "" };
      default:
        throw new Error(`unknown operation ${body.operation}`);
    }
  };
  return { request, operations };
}

async function withProject(run) {
  const tmp = mkdtempSync(join(tmpdir(), "moai-seed-"));
  try {
    const root = join(tmp, "soksak");
    mkdirSync(join(root, ".git"), { recursive: true });
    writeFileSync(join(root, ".git", "config"), '[remote "origin"]\n\turl = git@github.com:min-0-max/soksak.git\n');
    await run(root);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function deps(root, language, extra = {}) {
  const { request, operations } = folderRequest(root);
  return {
    operations,
    options: {
      request,
      project: { id: "p1", root },
      language,
      now: () => new Date("2026-11-23T00:00:00Z"),
      readIndex: async () => JSON.stringify(INDEX),
      readSeed: async (file) => SEED[file],
      ...extra,
    },
  };
}

test("a fresh project gets every seed file, rendered, and its folders are created first", () => withProject(async (root) => {
  const { options, operations } = deps(root, "ko-KR");
  const result = await seedMoaiProject(options);
  assert.deepEqual(result.written, [".moai/README.md", ".moai/config/sections/language.yaml", ".moai/config/sections/user.yaml"]);
  assert.deepEqual(result.kept, []);
  assert.equal(readFileSync(join(root, ".moai", "config", "sections", "user.yaml"), "utf8"), 'name: "soksak"\n');
  assert.equal(readFileSync(join(root, ".moai", "config", "sections", "language.yaml"), "utf8"), 'conversation: "ko"\n');
  assert.deepEqual(operations.filter((op) => op.startsWith("createFolder")), ["createFolder .moai", "createFolder .moai/config", "createFolder .moai/config/sections"]);
  assert.equal(operations.findIndex((op) => op.startsWith("createFolder")) < operations.findIndex((op) => op.startsWith("write")), true);
}));

test("a second run over a complete seed creates no folder and writes nothing", () => withProject(async (root) => {
  await seedMoaiProject(deps(root, "ko-KR").options);
  const second = deps(root, "ko-KR");
  const result = await seedMoaiProject(second.options);
  assert.deepEqual(result.written, []);
  assert.deepEqual(result.kept, [".moai/README.md", ".moai/config/sections/language.yaml", ".moai/config/sections/user.yaml"]);
  assert.deepEqual(second.operations.filter((op) => op.startsWith("createFolder") || op.startsWith("write")), []);
}));

test("an existing file is left as it is and reported", () => withProject(async (root) => {
  mkdirSync(join(root, ".moai"));
  writeFileSync(join(root, ".moai", "README.md"), "mine\n");
  const result = await seedMoaiProject(deps(root, "en").options);
  assert.equal(readFileSync(join(root, ".moai", "README.md"), "utf8"), "mine\n");
  assert.deepEqual(result.kept, [".moai/README.md"]);
  assert.equal(result.written.includes(".moai/README.md"), false);
}));

test("an unsupported locale is refused by name with the supported list, and writes nothing", () => withProject(async (root) => {
  await assert.rejects(
    seedMoaiProject(deps(root, "pt-BR").options),
    /locale pt is not a language moai names; supported: ko, en, ja, zh, es, fr, de/,
  );
  assert.equal(existsSync(join(root, ".moai")), false);
}));

test("a page without a project is refused", async () => {
  await assert.rejects(seedMoaiProject({ ...deps("/nonexistent", "en").options, project: null }), /moai seed needs a project/);
});

test("a .git that is not a folder is refused, and nothing is written", () => withProject(async (root) => {
  rmSync(join(root, ".git"), { recursive: true, force: true });
  writeFileSync(join(root, ".git"), "gitdir: elsewhere\n");
  await assert.rejects(seedMoaiProject(deps(root, "en").options), /moai seed cannot read the git remote: \.git is not a folder/);
  assert.equal(existsSync(join(root, ".moai")), false);
}));
