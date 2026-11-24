#!/usr/bin/env node
// Builds the release folders of the moai plugin from the moai-adk release pinned in release/upstream.json:
//   plugin/               the maker folder (agents docs/spec/makers.md): a session loads it with --plugin-dir and --add-dir, so nothing of
//                         moai is written into a project and the texts call the agents, skills and commands by their own names
//     .claude-plugin/plugin.json   the plugin manifest that --plugin-dir reads
//     hooks/hooks.json     the hook registrations, with the scripts under ${CLAUDE_PLUGIN_ROOT}/hooks/moai/ and bin/ on their PATH
//     hooks/moai/          the hook scripts that a registration or an agent hook runs
//     bin/moai             the darwin-arm64 moai binary built from the pinned source with release/patches/claude-config-dir.patch applied,
//                          with bin/moai.patch and bin/moai.LICENSE
//     .claude/agents/moai/ the moai agents without their model line, their hooks under $MOAI_PLUGIN/hooks/moai/ with bin/ on their PATH
//     .claude/skills/moai*/, .claude/commands/moai/, .claude/output-styles/moai/, .claude/workflows/, .claude/rules/
//                          the moai skills, commands, output styles, workflows and the rule files that the texts name, unchanged
//     LICENSE              the Apache-2.0 LICENSE of moai-adk
//   maker/index.js        the data module: the moai agents with their path in the maker folder and the model of each definition
//   maker/moai.js         the contributed group module: src/group.js and maker/index.js bundled into one file with no import
//   maker/settings.json   the settings of the release that are not hook registrations (the account settings)
//   maker/seed/.moai      the release .moai folder with its templates unrendered (the page renders them with the project values)
// The release file must equal its sha256 pin before anything is extracted or written. The build reads no other network address than the
// release file and the Go modules of its go.sum.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { parse } from "../ui/vendor/yaml.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HOOK_PREFIX = "${CLAUDE_PROJECT_DIR}/.claude/hooks/moai/";
const PLUGIN_HOOK_PREFIX = "${CLAUDE_PLUGIN_ROOT}/hooks/moai/";
const LOG_FOLDER_FROM = 'd="${0%/.claude/hooks/moai/*}"';
const LOG_FOLDER_TO = 'd="${CLAUDE_PROJECT_DIR}"';
// A plugin hook runs without the plugin bin/ folder on its PATH, and the scripts look for moai on PATH (agents A37 (10)).
// The scripts write their error output to $HOME/.moai/logs unless MOAI_HOOK_STDERR_LOG names a file under the project .moai/logs, so a
// registration names that file and the log stays in the project.
const HOOK_PATH = 'PATH="${CLAUDE_PLUGIN_ROOT}/bin:$PATH"; export MOAI_HOOK_STDERR_LOG="${CLAUDE_PROJECT_DIR}/.moai/logs/hook-stderr.log"; ';
// An agent hook of a folder added with --add-dir has no CLAUDE_PLUGIN_ROOT; the session sets MOAI_PLUGIN to the maker folder.
const AGENT_HOOK_FROM = '\\"$CLAUDE_PROJECT_DIR/.claude/hooks/moai/';
const AGENT_HOOK_TO = 'PATH=\\"$MOAI_PLUGIN/bin:$PATH\\" MOAI_HOOK_STDERR_LOG=\\"$CLAUDE_PROJECT_DIR/.moai/logs/hook-stderr.log\\" \\"$MOAI_PLUGIN/hooks/moai/';
// The folders of the release .claude that the maker folder holds unchanged.
const COPIED = ["commands/moai", "output-styles/moai", "workflows", "rules"];

// frontmatterFields returns the name and the optional model of an agent file. The name is required, because the group
// identifies the agent by it; a model that is present must be a non-empty string.
export function frontmatterFields(file, text) {
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  const data = match ? parse(match[1]) : null;
  if (!data || typeof data.name !== "string" || data.name.trim() === "") {
    throw new Error(`${file}: frontmatter name is missing`);
  }
  if (data.model !== undefined && (typeof data.model !== "string" || data.model.trim() === "")) {
    throw new Error(`${file}: frontmatter model must be a non-empty string`);
  }
  return { name: data.name.trim(), model: data.model === undefined ? undefined : data.model.trim() };
}

// transformHooks moves each registration to the plugin path. A registration that runs a script outside the moai hook folder is an error.
function transformHooks(hooks, scripts) {
  const moved = {};
  for (const [event, groups] of Object.entries(hooks)) {
    moved[event] = groups.map((group) => ({
      ...group,
      hooks: (group.hooks ?? []).map((hook) => {
        const args = [...(hook.args ?? [])];
        const index = args.findIndex((arg) => typeof arg === "string" && arg.startsWith(HOOK_PREFIX));
        if (index < 0) {
          throw new Error(`hook command outside .claude/hooks/moai: ${[hook.command, ...args].join(" ")}`);
        }
        // The fallback of the command derives the log folder from $0, which is the script path. A plugin path has no
        // .claude/hooks/moai segment, so the fallback takes the project folder from CLAUDE_PROJECT_DIR, the variable that
        // the same command already uses for the script path.
        if (args[0] !== "-c" || typeof args[1] !== "string") throw new Error(`hook command is not bash -c <script> <path>: ${[hook.command, ...args].join(" ")}`);
        args[1] = HOOK_PATH + args[1];
        for (let i = 0; i < args.length; i += 1) {
          if (typeof args[i] === "string" && args[i].includes(LOG_FOLDER_FROM)) {
            args[i] = args[i].replaceAll(LOG_FOLDER_FROM, LOG_FOLDER_TO);
          }
          if (typeof args[i] === "string" && args[i].includes("${0%")) {
            throw new Error(`hook fallback derives a folder from $0 and is not rewritten: ${hook.command} ${args[i]}`);
          }
        }
        const script = args[index].slice(HOOK_PREFIX.length);
        if (script === "" || basename(script) !== script) throw new Error(`hook script name is not a file name: ${script}`);
        scripts.add(script);
        args[index] = PLUGIN_HOOK_PREFIX + script;
        return { ...hook, args };
      }),
    }));
  }
  return moved;
}

// The module path of moai-adk, whose pkg/version variables the build sets as the upstream release build sets them (.goreleaser.yml).
const MODULE = "github.com/modu-ai/moai-adk";

// buildBinary writes out/plugin/bin/moai from the extracted source release root: it applies patch to the source, builds ./cmd/moai for
// darwin-arm64 with Version set to the release version and Commit set to patch-<first 12 hexadecimal digits of the sha256 of the patch>,
// so `moai version` names the patch, and writes the patch and the Apache-2.0 LICENSE of moai-adk beside the binary. The release
// publishes no binary with this change (release/patches/claude-config-dir.patch states it), so the build compiles the pinned source.
export function buildBinary({ root, patch, version, out }) {
  try {
    execFileSync("git", ["apply", "--whitespace=nowarn", patch], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    throw new Error(`${patch}: the patch does not apply to the pinned source: ${String(error.stderr ?? error.message).trim()}`);
  }
  const digest = createHash("sha256").update(readFileSync(patch)).digest("hex").slice(0, 12);
  const bin = join(out, "plugin", "bin");
  mkdirSync(bin, { recursive: true });
  execFileSync("go", ["build", "-trimpath", "-ldflags", `-s -w -X ${MODULE}/pkg/version.Version=${version} -X ${MODULE}/pkg/version.Commit=patch-${digest}`, "-o", join(bin, "moai"), "./cmd/moai"], {
    cwd: root,
    env: { ...process.env, CGO_ENABLED: "0", GOOS: "darwin", GOARCH: "arm64" },
    stdio: ["ignore", "inherit", "inherit"],
  });
  copyFileSync(patch, join(bin, "moai.patch"));
  copyFileSync(join(root, "LICENSE"), join(bin, "moai.LICENSE"));
}

// agentText returns the text of an agent in the maker folder: the model line stays, because a session runs the agent as a subagent from
// this file, and each agent hook runs under $MOAI_PLUGIN/hooks/moai/ with bin/ on its PATH and its error log in the project. A hook path
// of the project that is not rewritten is an error that names the file.
export function agentText(file, text) {
  const moved = text.replaceAll(AGENT_HOOK_FROM, AGENT_HOOK_TO);
  if (moved.includes("$CLAUDE_PROJECT_DIR/.claude/")) throw new Error(`${file}: a hook names a project path under .claude that is not rewritten`);
  return moved;
}

// buildRelease writes plugin/ and maker/ under out from the release file of the pinned release and the patch of its source.
export function buildRelease({ releaseFile, sha256, version, out, patch }) {
  if (typeof version !== "string" || version === "") throw new Error("buildRelease requires the release version");
  if (patch === undefined) throw new Error("buildRelease requires the patch of the pinned source");
  const digest = createHash("sha256").update(readFileSync(releaseFile)).digest("hex");
  if (digest !== sha256) throw new Error(`release file sha256 ${digest} does not match the pinned ${sha256}: ${releaseFile}`);
  rmSync(join(out, "maker"), { recursive: true, force: true });
  rmSync(join(out, "plugin"), { recursive: true, force: true });

  const work = mkdtempSync(join(tmpdir(), "moai-release-"));
  try {
    execFileSync("tar", ["-xzf", releaseFile, "-C", work]);
    const top = readdirSync(work);
    if (top.length !== 1) throw new Error(`release file must hold one top folder, found: ${top.join(", ")}`);
    const root = join(work, top[0]);
    const claude = join(root, ".claude");
    const plugin = join(out, "plugin");
    mkdirSync(join(out, "maker"), { recursive: true });

    // agents: .claude/agents/moai/*.md, at their upstream paths in the maker folder, without the model line and with the hooks moved
    const agentSource = join(claude, "agents", "moai");
    const scripts = new Set();
    const agents = readdirSync(agentSource)
      .filter((file) => file.endsWith(".md"))
      .sort()
      .map((file) => {
        const text = readText(join(agentSource, file));
        const { name, model } = frontmatterFields(`agents/moai/${file}`, text);
        const path = `.claude/agents/moai/${file}`;
        const moved = agentText(path, text);
        for (const match of moved.matchAll(/\$MOAI_PLUGIN\/hooks\/moai\/([A-Za-z0-9._-]+)/g)) scripts.add(match[1]);
        mkdirSync(join(plugin, ".claude", "agents", "moai"), { recursive: true });
        writeFileSync(join(plugin, path), moved);
        return model === undefined ? { name, path, cli: "claude" } : { name, path, cli: "claude", model };
      });

    // skills: .claude/skills/moai*/ that hold a SKILL.md, every file of each folder unchanged
    const skillSource = join(claude, "skills");
    for (const name of readdirSync(skillSource).filter((entry) => entry.startsWith("moai") && existsSync(join(skillSource, entry, "SKILL.md"))).sort()) {
      cpSync(join(skillSource, name), join(plugin, ".claude", "skills", name), { recursive: true });
    }
    // commands, output styles, workflows and rules, which the texts name by their .claude paths
    for (const folder of COPIED) {
      const source = join(claude, folder);
      if (!existsSync(source)) throw new Error(`release has no .claude/${folder} folder`);
      cpSync(source, join(plugin, ".claude", folder), { recursive: true });
    }
    // moai-adk is Apache-2.0: the maker folder carries the LICENSE of the release.
    if (!existsSync(join(root, "LICENSE"))) throw new Error("release has no LICENSE at its top");
    buildBinary({ root, patch, version, out });
    copyFileSync(join(root, "LICENSE"), join(plugin, "LICENSE"));
    mkdirSync(join(plugin, ".claude-plugin"), { recursive: true });
    writeFileSync(join(plugin, ".claude-plugin", "plugin.json"), `${JSON.stringify({ name: "moai", version: version.replace(/^v/, ""), description: "The hooks and the moai binary of moai-adk for a session of the moai maker folder.", license: "Apache-2.0" }, null, 2)}\n`);

    // The data module holds the agents with their path in the maker folder.
    writeFileSync(join(out, "maker", "index.js"), indexModule({ agents }));
    bundleGroup(out);

    // settings: the registrations go to plugin/hooks/hooks.json, the rest to maker/settings.json
    const settings = JSON.parse(readFileSync(join(claude, "settings.json"), "utf8"));
    const { hooks = {}, ...rest } = settings;
    const moved = transformHooks(hooks, scripts);
    const hookDest = join(plugin, "hooks", "moai");
    mkdirSync(hookDest, { recursive: true });
    for (const script of [...scripts].sort()) {
      const source = join(claude, "hooks", "moai", script);
      if (!existsSync(source)) throw new Error(`hook script is missing from the release: hooks/moai/${script}`);
      cpSync(source, join(hookDest, script));
    }
    writeFileSync(join(plugin, "hooks", "hooks.json"), `${JSON.stringify({ hooks: moved }, null, 2)}\n`);
    writeFileSync(join(out, "maker", "settings.json"), `${JSON.stringify(rest, null, 2)}\n`);

    // seed: the release .moai folder, shipped unrendered; the page renders its templates with the project values
    const seedSource = join(root, "internal", "template", "templates", ".moai");
    if (!existsSync(seedSource)) throw new Error("release has no .moai template folder: internal/template/templates/.moai");
    cpSync(seedSource, join(out, "maker", "seed", ".moai"), { recursive: true });
    // The page reads the seed through the plugin modules path, which lists no folder, so the build writes the file list
    // (relative to .moai, templates with their suffix) and the release version that the page writes into Version.
    const seedFiles = listFiles(seedSource).sort();
    writeFileSync(join(out, "maker", "seed", "index.json"), `${JSON.stringify({ version, files: seedFiles }, null, 2)}\n`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

// Lists the files under folder as paths relative to it, with a slash between the parts.
function listFiles(folder, prefix = "") {
  return readdirSync(join(folder, prefix), { withFileTypes: true }).flatMap((entry) => {
    const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    return entry.isDirectory() ? listFiles(folder, path) : [path];
  });
}

// readText returns the UTF-8 text of a file of the release; a file that is not UTF-8 text is an error that names it.
function readText(file) {
  return new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(file));
}

// bundleGroup writes maker/moai.js, the module that plugin.json contributes, from src/group.js and maker/index.js.
// Core grants a provider page only the contributed module file, so the file holds the data and imports nothing.
function bundleGroup(out) {
  const indexPath = join(out, "maker", "index.js");
  buildSync({
    stdin: {
      contents: `import * as index from ${JSON.stringify(indexPath)};\nimport { groupFrom } from ${JSON.stringify(join(ROOT, "src", "group.js"))};\nexport async function group() {\n  return groupFrom(index);\n}\n`,
      resolveDir: ROOT,
      sourcefile: "maker-entry.js",
    },
    bundle: true,
    format: "esm",
    target: "safari17",
    outfile: join(out, "maker", "moai.js"),
    logLevel: "silent",
  });
}

// indexModule returns the source of the data module maker/index.js with the agents.
export function indexModule({ agents }) {
  return `export const agents = ${JSON.stringify(agents, null, 2)};\n`;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith("--") || argv[i + 1] === undefined) throw new Error(`usage: build-release.mjs [--release-file <file>] [--out <folder>]`);
    args[argv[i].slice(2)] = argv[i + 1];
  }
  return args;
}

async function main(argv) {
  const args = parseArgs(argv);
  const pin = JSON.parse(readFileSync(join(ROOT, "release", "upstream.json"), "utf8"));
  let releaseFile = args["release-file"];
  if (!releaseFile) {
    const response = await fetch(pin.url);
    if (!response.ok) throw new Error(`fetch ${pin.url}: HTTP ${response.status}`);
    const folder = mkdtempSync(join(tmpdir(), "moai-release-file-"));
    releaseFile = join(folder, basename(pin.url));
    writeFileSync(releaseFile, Buffer.from(await response.arrayBuffer()));
  }
  buildRelease({
    releaseFile,
    sha256: pin.sha256,
    version: pin.tag,
    out: args.out ?? ROOT,
    patch: join(ROOT, "release", "patches", "claude-config-dir.patch"),
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
