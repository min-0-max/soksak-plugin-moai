// Checks the release build of the moai plugin on a fixture of the upstream release layout (moai-adk v3.1.2 `.claude` folder).
// The build reads the release file, checks its sha256, moves the hook registrations into plugin/hooks/hooks.json, copies the hook
// scripts they run, writes the moai agents and skills into maker/, and writes the non-hook settings (scripts/build-release.mjs).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "node:http";
import { buildRelease } from "../scripts/build-release.mjs";
import { groupFromIndex } from "../ui/makers/moai.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixtureParent = join(here, "fixtures", "upstream-release");

function releaseFileOfFixture(work) {
  const releaseFile = join(work, "moai-adk-fixture.tar.gz");
  execFileSync("tar", ["-czf", releaseFile, "-C", fixtureParent, "moai-adk-fixture"]);
  return { releaseFile, sha256: createHash("sha256").update(readFileSync(releaseFile)).digest("hex") };
}

async function withBuildAsync(run) {
  const work = mkdtempSync(join(tmpdir(), "moai-release-test-"));
  try {
    const { releaseFile, sha256 } = releaseFileOfFixture(work);
    await run({ work, releaseFile, sha256, out: join(work, "out") });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

function withBuild(run) {
  const work = mkdtempSync(join(tmpdir(), "moai-release-test-"));
  try {
    const { releaseFile, sha256 } = releaseFileOfFixture(work);
    run({ work, releaseFile, sha256, out: join(work, "out") });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

test("the build writes the moai agents and moai skills into maker/index.json, and no other agent or skill", () => {
  withBuild(({ releaseFile, sha256, out }) => {
    buildRelease({ releaseFile, sha256, out });
    const index = JSON.parse(readFileSync(join(out, "maker", "index.json"), "utf8"));
    assert.deepEqual(index.agents, [
      { name: "manager-develop", path: "agents/moai/manager-develop.md", cli: "claude" },
      { name: "manager-spec", path: "agents/moai/manager-spec.md", cli: "claude", model: "opus" },
    ]);
    assert.deepEqual(index.skills, ["skills/moai-run"]);
    assert.ok(existsSync(join(out, "maker", "agents", "moai", "manager-spec.md")));
    assert.ok(existsSync(join(out, "maker", "skills", "moai-run", "extra.md")));
    assert.ok(!existsSync(join(out, "maker", "agents", "harness")));
    assert.ok(!existsSync(join(out, "maker", "skills", "hns-lsel")));
  });
});

test("the hook registrations move to plugin/hooks/hooks.json under CLAUDE_PLUGIN_ROOT, with the scripts they run", () => {
  withBuild(({ releaseFile, sha256, out }) => {
    buildRelease({ releaseFile, sha256, out });
    const hooks = JSON.parse(readFileSync(join(out, "plugin", "hooks", "hooks.json"), "utf8")).hooks;
    assert.equal(hooks.SessionStart[0].hooks[0].args.at(-1), "${CLAUDE_PLUGIN_ROOT}/hooks/moai/handle-start.sh");
    assert.equal(hooks.PreToolUse[0].hooks[0].args.at(-1), "${CLAUDE_PLUGIN_ROOT}/hooks/moai/handle-start.sh");
    assert.equal(hooks.SessionStart[0].matcher, "startup|resume");
    assert.ok(existsSync(join(out, "plugin", "hooks", "moai", "handle-start.sh")));
    assert.ok(!existsSync(join(out, "plugin", "hooks", "moai", "unused.sh")), "scripts that no registration runs are not copied");
  });
});

test("the non-hook settings go to maker/settings.json, and the hooks do not stay in them", () => {
  withBuild(({ releaseFile, sha256, out }) => {
    buildRelease({ releaseFile, sha256, out });
    const settings = JSON.parse(readFileSync(join(out, "maker", "settings.json"), "utf8"));
    assert.equal(settings.hooks, undefined);
    assert.deepEqual(settings.env, { ENABLE_TOOL_SEARCH: "1" });
    assert.equal(settings.statusLine.command, "$CLAUDE_PROJECT_DIR/.moai/status_line.sh");
  });
});

test("a release file whose sha256 differs from the pin is refused before anything is extracted", () => {
  withBuild(({ releaseFile, out }) => {
    assert.throws(() => buildRelease({ releaseFile, sha256: "0".repeat(64), out }), /sha256 .* does not match/);
    assert.ok(!existsSync(join(out, "maker")));
  });
});

test("a hook that runs a script outside .claude/hooks/moai is an error that names the command", () => {
  withBuild(({ work, out }) => {
    const src = join(work, "src", "moai-adk-fixture", ".claude");
    mkdirSync(join(work, "src"));
    execFileSync("cp", ["-R", join(fixtureParent, "moai-adk-fixture"), join(work, "src")]);
    writeFileSync(join(src, "settings.json"), JSON.stringify({
      hooks: { Stop: [{ hooks: [{ command: "bash", args: ["/usr/local/bin/other.sh"] }] }] },
    }));
    execFileSync("tar", ["-czf", join(work, "bad.tar.gz"), "-C", join(work, "src"), "moai-adk-fixture"]);
    const sha256 = createHash("sha256").update(readFileSync(join(work, "bad.tar.gz"))).digest("hex");
    assert.throws(() => buildRelease({ releaseFile: join(work, "bad.tar.gz"), sha256, out }), /\/usr\/local\/bin\/other\.sh/);
  });
});

test("an agent without a name in its frontmatter is an error that names the file", () => {
  withBuild(({ work, out }) => {
    const src = join(work, "src", "moai-adk-fixture", ".claude", "agents", "moai");
    mkdirSync(join(work, "src"));
    execFileSync("cp", ["-R", join(fixtureParent, "moai-adk-fixture"), join(work, "src")]);
    writeFileSync(join(src, "manager-spec.md"), "---\ndescription: no name\n---\n");
    execFileSync("tar", ["-czf", join(work, "bad.tar.gz"), "-C", join(work, "src"), "moai-adk-fixture"]);
    const sha256 = createHash("sha256").update(readFileSync(join(work, "bad.tar.gz"))).digest("hex");
    assert.throws(() => buildRelease({ releaseFile: join(work, "bad.tar.gz"), sha256, out }), /manager-spec\.md: frontmatter name/);
  });
});

test("the fallback of a hook command, which runs when its script is missing, writes its log into the project folder", () => {
  withBuild(({ releaseFile, sha256, out, work }) => {
    buildRelease({ releaseFile, sha256, out });
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

test("the model of an agent definition moves to its index entry, and the copied definition has no model line", () => {
  withBuild(({ releaseFile, sha256, out }) => {
    buildRelease({ releaseFile, sha256, out });
    const copied = readFileSync(join(out, "maker", "agents", "moai", "manager-spec.md"), "utf8");
    assert.equal(copied, "---\nname: manager-spec\ndescription: SPEC builder\n---\nSPEC body\n");
    const develop = JSON.parse(readFileSync(join(out, "maker", "index.json"), "utf8")).agents[0];
    assert.equal(develop.model, undefined, "an agent without a model has no model key");
  });
});

test("the built maker index is accepted by the group module that reads it", async () => {
  await withBuildAsync(async ({ releaseFile, sha256, out }) => {
    buildRelease({ releaseFile, sha256, out });
    const server = createServer((request, response) => {
      const file = join(out, "maker", decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname));
      if (!existsSync(file)) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { "content-type": file.endsWith(".json") ? "application/json" : "text/plain" }).end(readFileSync(file));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const url = new URL(`http://127.0.0.1:${server.address().port}/index.json`);
      const group = await groupFromIndex(url);
      assert.deepEqual(group.agents.map((agent) => agent.path), ["agents/moai/manager-develop.md", "agents/moai/manager-spec.md"]);
      assert.deepEqual(group.skills, ["skills/moai-run"]);
      assert.equal(group.agents[1].model, "opus");
    } finally {
      server.close();
    }
  });
});
