// Checks the release build of the moai plugin on a fixture of the upstream release layout (moai-adk v3.1.2 `.claude` folder).
// The build reads the release file, checks its sha256, writes the maker folder plugin/ (agents, skills, commands, output styles,
// workflows, rules, hooks, the moai binary and the license) and maker/ with the agent list, the group module, the non-hook settings and
// the seed (scripts/build-release.mjs).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildRelease } from "../scripts/build-release.mjs";
import { pathToFileURL } from "node:url";
import { buildSync } from "esbuild";
import { groupFrom } from "../src/group.js";

// Imports the data module that the release build wrote into out/maker/index.js.
async function indexOf(out) {
  return import(pathToFileURL(join(out, "maker", "index.js")).href);
}

const VERSION = "v3.1.2";

const here = dirname(fileURLToPath(import.meta.url));
const fixtureParent = join(here, "fixtures", "upstream-release");

function releaseFileOfFixture(work) {
  const releaseFile = join(work, "moai-adk-fixture.tar.gz");
  execFileSync("tar", ["-czf", releaseFile, "-C", fixtureParent, "moai-adk-fixture"]);
  return { releaseFile, sha256: createHash("sha256").update(readFileSync(releaseFile)).digest("hex"), binary: binaryOfFixture(work) };
}

// The binary release file of the fixture: a file named moai at its top, as the pinned asset holds it. The fixture binary is a script that
// prints its own name, so the test runs the copied file.
function binaryOfFixture(work, { notice = false } = {}) {
  const folder = join(work, "binary-src");
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, "moai"), "#!/bin/sh\necho fixture-moai\n");
  writeFileSync(join(folder, "LICENSE"), "fixture Apache License 2.0 text\n");
  const names = ["moai", "LICENSE"];
  if (notice) {
    writeFileSync(join(folder, "NOTICE"), "fixture NOTICE text\n");
    names.push("NOTICE");
  }
  const file = join(work, notice ? "moai-adk_fixture_notice_darwin_arm64.tar.gz" : "moai-adk_fixture_darwin_arm64.tar.gz");
  execFileSync("tar", ["-czf", file, "-C", folder, ...names]);
  return { file, sha256: createHash("sha256").update(readFileSync(file)).digest("hex") };
}

async function withBuildAsync(run) {
  const work = mkdtempSync(join(tmpdir(), "moai-release-test-"));
  try {
    const { releaseFile, sha256, binary } = releaseFileOfFixture(work);
    await run({ work, releaseFile, sha256, binary, out: join(work, "out") });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

function withBuild(run) {
  const work = mkdtempSync(join(tmpdir(), "moai-release-test-"));
  try {
    const { releaseFile, sha256, binary } = releaseFileOfFixture(work);
    run({ work, releaseFile, sha256, binary, out: join(work, "out") });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

test("the build lists the moai agents in maker/index.js with their path in the maker folder, and no other agent", async () => {
  await withBuildAsync(async ({ releaseFile, sha256, binary, out }) => {
    buildRelease({ releaseFile, sha256, version: VERSION, out, binary });
    const index = await indexOf(out);
    assert.deepEqual(Object.keys(index), ["agents"]);
    assert.deepEqual(index.agents, [
      { name: "manager-develop", path: ".claude/agents/moai/manager-develop.md", cli: "claude" },
      { name: "manager-spec", path: ".claude/agents/moai/manager-spec.md", cli: "claude", model: "opus" },
    ]);
    assert.ok(!existsSync(join(out, "plugin", ".claude", "agents", "harness")));
  });
});

test("the maker folder holds the moai skills, commands, output styles, workflows and rules of the release unchanged, and no other", () => {
  withBuild(({ releaseFile, sha256, binary, out }) => {
    buildRelease({ releaseFile, sha256, version: VERSION, out, binary });
    const claude = join(out, "plugin", ".claude");
    assert.equal(readFileSync(join(claude, "skills", "moai-run", "extra.md"), "utf8"), readFileSync(join(fixtureParent, "moai-adk-fixture", ".claude", "skills", "moai-run", "extra.md"), "utf8"));
    assert.ok(!existsSync(join(claude, "skills", "hns-lsel")), "a skill outside moai is not copied");
    assert.ok(!existsSync(join(claude, "skills", "moai-empty")), "a folder without SKILL.md is not copied");
    assert.equal(readFileSync(join(claude, "commands", "moai", "run.md"), "utf8"), "---\ndescription: Runs moai.\n---\nRun moai.\n");
    assert.ok(!existsSync(join(claude, "commands", "other")), "a command outside moai is not copied");
    assert.equal(readFileSync(join(claude, "output-styles", "moai", "moai.md"), "utf8"), "moai style\n");
    assert.equal(readFileSync(join(claude, "workflows", "flow.js"), "utf8"), "export default 1;\n");
    assert.equal(readFileSync(join(claude, "rules", "moai", "core.md"), "utf8"), "core rule\n");
  });
});

test("an agent of the maker folder keeps its model line, which a subagent runs with, and runs its hooks from the maker folder", () => {
  withBuild(({ releaseFile, sha256, binary, out }) => {
    buildRelease({ releaseFile, sha256, version: VERSION, out, binary });
    const agents = join(out, "plugin", ".claude", "agents", "moai");
    assert.equal(readFileSync(join(agents, "manager-spec.md"), "utf8"), "---\nname: manager-spec\ndescription: SPEC builder\nmodel: opus\n---\nSPEC body\n");
    const develop = readFileSync(join(agents, "manager-develop.md"), "utf8");
    assert.ok(develop.includes('command: "PATH=\\"$MOAI_PLUGIN/bin:$PATH\\" MOAI_HOOK_STDERR_LOG=\\"$CLAUDE_PROJECT_DIR/.moai/logs/hook-stderr.log\\" \\"$MOAI_PLUGIN/hooks/moai/handle-agent-hook.sh\\" \\"develop-completion\\""'), develop);
    assert.ok(!develop.includes("$CLAUDE_PROJECT_DIR/.claude/"));
    assert.ok(existsSync(join(out, "plugin", "hooks", "moai", "handle-agent-hook.sh")), "the script of an agent hook is copied");
  });
});

test("the maker folder carries the plugin manifest of --plugin-dir and the Apache-2.0 LICENSE of moai-adk", () => {
  withBuild(({ releaseFile, sha256, binary, out }) => {
    buildRelease({ releaseFile, sha256, version: VERSION, out, binary });
    assert.deepEqual(JSON.parse(readFileSync(join(out, "plugin", ".claude-plugin", "plugin.json"), "utf8")), {
      name: "moai", version: "3.1.2", description: "The hooks and the moai binary of moai-adk for a session of the moai maker folder.", license: "Apache-2.0",
    });
    assert.equal(readFileSync(join(out, "plugin", "LICENSE"), "utf8"), "fixture Apache License 2.0 of moai-adk\n");
  });
});

test("the hook registrations move to plugin/hooks/hooks.json under CLAUDE_PLUGIN_ROOT, with the scripts they run", () => {
  withBuild(({ releaseFile, sha256, binary, out }) => {
    buildRelease({ releaseFile, sha256, version: VERSION, out, binary });
    const hooks = JSON.parse(readFileSync(join(out, "plugin", "hooks", "hooks.json"), "utf8")).hooks;
    assert.equal(hooks.SessionStart[0].hooks[0].args.at(-1), "${CLAUDE_PLUGIN_ROOT}/hooks/moai/handle-start.sh");
    assert.equal(hooks.PreToolUse[0].hooks[0].args.at(-1), "${CLAUDE_PLUGIN_ROOT}/hooks/moai/handle-start.sh");
    assert.equal(hooks.SessionStart[0].matcher, "startup|resume");
    assert.ok(hooks.SessionStart[0].hooks[0].args[1].startsWith('PATH="${CLAUDE_PLUGIN_ROOT}/bin:$PATH"; export MOAI_HOOK_STDERR_LOG="${CLAUDE_PROJECT_DIR}/.moai/logs/hook-stderr.log"; '), "a registration puts bin/ on the PATH of its script and its error log in the project");
    assert.ok(existsSync(join(out, "plugin", "hooks", "moai", "handle-start.sh")));
    assert.ok(!existsSync(join(out, "plugin", "hooks", "moai", "unused.sh")), "scripts that no registration or agent hook runs are not copied");
  });
});

test("the non-hook settings go to maker/settings.json, and the hooks do not stay in them", () => {
  withBuild(({ releaseFile, sha256, binary, out }) => {
    buildRelease({ releaseFile, sha256, version: VERSION, out, binary });
    const settings = JSON.parse(readFileSync(join(out, "maker", "settings.json"), "utf8"));
    assert.equal(settings.hooks, undefined);
    assert.deepEqual(settings.env, { ENABLE_TOOL_SEARCH: "1" });
    assert.equal(settings.statusLine.command, "$CLAUDE_PROJECT_DIR/.moai/status_line.sh");
  });
});

test("a release file whose sha256 differs from the pin is refused before anything is extracted", () => {
  withBuild(({ releaseFile, binary, out }) => {
    assert.throws(() => buildRelease({ releaseFile, sha256: "0".repeat(64), version: VERSION, out, binary }), /sha256 .* does not match/);
    assert.ok(!existsSync(join(out, "maker")));
  });
});

test("a hook that runs a script outside .claude/hooks/moai is an error that names the command", () => {
  withBuild(({ work, binary, out }) => {
    const src = join(work, "src", "moai-adk-fixture", ".claude");
    mkdirSync(join(work, "src"));
    execFileSync("cp", ["-R", join(fixtureParent, "moai-adk-fixture"), join(work, "src")]);
    writeFileSync(join(src, "settings.json"), JSON.stringify({
      hooks: { Stop: [{ hooks: [{ command: "bash", args: ["/usr/local/bin/other.sh"] }] }] },
    }));
    execFileSync("tar", ["-czf", join(work, "bad.tar.gz"), "-C", join(work, "src"), "moai-adk-fixture"]);
    const sha256 = createHash("sha256").update(readFileSync(join(work, "bad.tar.gz"))).digest("hex");
    assert.throws(() => buildRelease({ releaseFile: join(work, "bad.tar.gz"), sha256, version: VERSION, out, binary }), /\/usr\/local\/bin\/other\.sh/);
  });
});

test("an agent without a name in its frontmatter is an error that names the file", () => {
  withBuild(({ work, binary, out }) => {
    const src = join(work, "src", "moai-adk-fixture", ".claude", "agents", "moai");
    mkdirSync(join(work, "src"));
    execFileSync("cp", ["-R", join(fixtureParent, "moai-adk-fixture"), join(work, "src")]);
    writeFileSync(join(src, "manager-spec.md"), "---\ndescription: no name\n---\n");
    execFileSync("tar", ["-czf", join(work, "bad.tar.gz"), "-C", join(work, "src"), "moai-adk-fixture"]);
    const sha256 = createHash("sha256").update(readFileSync(join(work, "bad.tar.gz"))).digest("hex");
    assert.throws(() => buildRelease({ releaseFile: join(work, "bad.tar.gz"), sha256, version: VERSION, out, binary }), /manager-spec\.md: frontmatter name/);
  });
});

test("the fallback of a hook command, which runs when its script is missing, writes its log into the project folder", () => {
  withBuild(({ releaseFile, sha256, binary, out, work }) => {
    buildRelease({ releaseFile, sha256, version: VERSION, out, binary });
    const hooks = JSON.parse(readFileSync(join(out, "plugin", "hooks", "hooks.json"), "utf8")).hooks;
    const hook = hooks.SessionStart[0].hooks[0];
    assert.match(hook.args[1], /d="\$\{CLAUDE_PROJECT_DIR\}"/);
    assert.doesNotMatch(hook.args[1], /\$\{0%/);
    const pluginRoot = join(work, "installed-plugin");
    const projectDir = join(work, "project");
    mkdirSync(projectDir, { recursive: true });
    const scriptPath = hook.args[2].replace("${CLAUDE_PLUGIN_ROOT}", pluginRoot);
    execFileSync("bash", ["-c", hook.args[1], scriptPath], {
      env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    });
    const log = readFileSync(join(projectDir, ".moai", "logs", "hook-missing.log"), "utf8");
    assert.match(log, /hook missing: .*handle-start\.sh/);
    assert.ok(!existsSync(join(pluginRoot, ".moai")), "the log is not written under the plugin folder");
  });
});

test("the model of an agent definition moves to its index entry, and an agent without one has no model key", async () => {
  await withBuildAsync(async ({ releaseFile, sha256, binary, out }) => {
    buildRelease({ releaseFile, sha256, version: VERSION, out, binary });
    const index = await indexOf(out);
    assert.equal(index.agents[0].model, undefined, "an agent without a model has no model key");
    assert.equal(index.agents[1].model, "opus");
  });
});

test("the built data module is accepted by the group function that reads it", async () => {
  await withBuildAsync(async ({ releaseFile, sha256, binary, out }) => {
    buildRelease({ releaseFile, sha256, version: VERSION, out, binary });
    const group = groupFrom(await indexOf(out));
    assert.deepEqual(group.agents.map((agent) => agent.path), [".claude/agents/moai/manager-develop.md", ".claude/agents/moai/manager-spec.md"]);
    assert.equal(group.plugin, "plugin");
    for (const agent of group.agents) assert.ok(existsSync(join(out, group.plugin, agent.path)), agent.path);
  });
});

// Lists the static and dynamic imports and the export-from statements of a module file, as esbuild reads them without bundling.
function importsOf(file) {
  const result = buildSync({ entryPoints: [file], bundle: false, format: "esm", write: false, metafile: true, logLevel: "silent" });
  return Object.values(result.metafile.inputs).flatMap((input) => input.imports.map((entry) => `${entry.kind} ${entry.path}`));
}

test("the contributed group module maker/moai.js is one file with no import, because core grants a provider page only that file", async () => {
  await withBuildAsync(async ({ releaseFile, sha256, binary, out }) => {
    buildRelease({ releaseFile, sha256, version: VERSION, out, binary });
    const file = join(out, "maker", "moai.js");
    assert.ok(existsSync(file), "the build writes no maker/moai.js");
    assert.deepEqual(importsOf(file), []);
    const { group } = await import(pathToFileURL(file).href);
    const built = await group();
    assert.equal(built.id, "moai");
    assert.deepEqual(built.agents.map((agent) => agent.path), [".claude/agents/moai/manager-develop.md", ".claude/agents/moai/manager-spec.md"]);
    assert.equal(built.plugin, "plugin");
  });
});

test("the release .moai folder is shipped as maker/seed/.moai, templates unrendered, for the page to render with the project values", () => {
  withBuild(({ releaseFile, sha256, binary, out }) => {
    buildRelease({ releaseFile, sha256, version: VERSION, out, binary });
    assert.equal(readFileSync(join(out, "maker", "seed", ".moai", "config", "sections", "user.yaml.tmpl"), "utf8"), 'user:\n  name: "{{.UserName}}"\n');
    assert.equal(readFileSync(join(out, "maker", "seed", ".moai", "README.md"), "utf8"), "# moai project\n");
    assert.deepEqual(JSON.parse(readFileSync(join(out, "maker", "seed", "index.json"), "utf8")), {
      version: "v3.1.2",
      files: ["README.md", "config/sections/user.yaml.tmpl"],
    });
  });
});

test("the build writes the pinned moai binary to plugin/bin/moai as an executable copy of the binary release file's moai file", () => {
  withBuild(({ releaseFile, sha256, binary, out }) => {
    buildRelease({ releaseFile, sha256, version: VERSION, out, binary });
    const copied = join(out, "plugin", "bin", "moai");
    assert.equal(readFileSync(copied, "utf8"), "#!/bin/sh\necho fixture-moai\n");
    assert.equal(execFileSync(copied, { encoding: "utf8" }), "fixture-moai\n");
  });
});

test("a binary release file whose sha256 differs from the pin is refused before plugin/bin/moai is written", () => {
  withBuild(({ releaseFile, sha256, binary, out }) => {
    assert.throws(
      () => buildRelease({ releaseFile, sha256, version: VERSION, out, binary: { file: binary.file, sha256: "0".repeat(64) } }),
      /binary release file sha256 .* does not match the pinned/,
    );
    assert.equal(existsSync(join(out, "plugin", "bin", "moai")), false);
  });
});

test("a binary release file without a moai file at its top is an error that names the binary release file", () => {
  withBuild(({ releaseFile, sha256, work, out }) => {
    const folder = join(work, "wrong-src");
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "other"), "x");
    const file = join(work, "wrong.tar.gz");
    execFileSync("tar", ["-czf", file, "-C", folder, "other"]);
    const wrong = { file, sha256: createHash("sha256").update(readFileSync(file)).digest("hex") };
    assert.throws(() => buildRelease({ releaseFile, sha256, version: VERSION, out, binary: wrong }), /holds no moai file at its top/);
  });
});

test("the build copies the LICENSE of the binary release file to plugin/bin/moai.LICENSE", () => {
  withBuild(({ releaseFile, sha256, binary, out }) => {
    buildRelease({ releaseFile, sha256, version: VERSION, out, binary });
    assert.equal(readFileSync(join(out, "plugin", "bin", "moai.LICENSE"), "utf8"), "fixture Apache License 2.0 text\n");
  });
});

test("the build copies the NOTICE of the binary release file to plugin/plugin/bin/moai.NOTICE when the release file holds one", () => {
  withBuild(({ releaseFile, sha256, work, out }) => {
    const binary = binaryOfFixture(work, { notice: true });
    buildRelease({ releaseFile, sha256, version: VERSION, out, binary });
    assert.equal(readFileSync(join(out, "plugin", "bin", "moai.NOTICE"), "utf8"), "fixture NOTICE text\n");
  });
});

test("the build writes no plugin/bin/moai.NOTICE when the binary release file holds no NOTICE", () => {
  withBuild(({ releaseFile, sha256, binary, out }) => {
    buildRelease({ releaseFile, sha256, version: VERSION, out, binary });
    assert.equal(existsSync(join(out, "plugin", "bin", "moai.NOTICE")), false);
  });
});

test("a binary release file without a LICENSE is refused before plugin/bin/moai is written", () => {
  withBuild(({ releaseFile, sha256, work, out }) => {
    const folder = join(work, "no-license-src");
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "moai"), "#!/bin/sh\necho fixture-moai\n");
    const file = join(work, "no-license.tar.gz");
    execFileSync("tar", ["-czf", file, "-C", folder, "moai"]);
    const binary = { file, sha256: createHash("sha256").update(readFileSync(file)).digest("hex") };
    assert.throws(() => buildRelease({ releaseFile, sha256, version: VERSION, out, binary }), /holds no LICENSE at its top/);
    assert.equal(existsSync(join(out, "plugin", "bin", "moai")), false);
  });
});

