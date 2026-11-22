#!/usr/bin/env node
// Builds the release folders of the moai plugin from the moai-adk release pinned in release/upstream.json:
//   maker/index.json      the moai agents (.claude/agents/moai/*.md, with the model of each definition) and the moai skills (.claude/skills/moai*/ with SKILL.md)
//   maker/agents, maker/skills   the files that the index names, without the model line of each agent
//   maker/settings.json   the settings of the release that are not hook registrations (the account settings)
//   maker/seed/.moai      the release .moai folder with its templates unrendered (the page renders them with the project values)
//   plugin/hooks/hooks.json      the hook registrations, with the scripts under ${CLAUDE_PLUGIN_ROOT}/hooks/moai/
//   plugin/hooks/moai/    the hook scripts that a registration runs
//   bin/moai              the moai binary of the pinned darwin-arm64 asset of the same release (the program `plugin:bin/moai`)
//   bin/moai.LICENSE      the LICENSE of the release file, and bin/moai.NOTICE its NOTICE when the release file holds one
// The release file and the binary release file must equal their sha256 pins before anything is extracted or written. The build reads no other network address.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "../ui/vendor/yaml.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HOOK_PREFIX = "${CLAUDE_PROJECT_DIR}/.claude/hooks/moai/";
const PLUGIN_HOOK_PREFIX = "${CLAUDE_PLUGIN_ROOT}/hooks/moai/";
const LOG_FOLDER_FROM = 'd="${0%/.claude/hooks/moai/*}"';
const LOG_FOLDER_TO = 'd="${CLAUDE_PROJECT_DIR}"';

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

// withoutModel removes the model line of the frontmatter, so the session model is not overwritten (club.md, measurement C4).
export function withoutModel(text) {
  return text.replace(/^---\n([\s\S]*?)\n---/, (block, body) => `---\n${body.split("\n").filter((line) => !/^model:/.test(line)).join("\n")}\n---`);
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

// buildBinary writes out/bin/moai from the binary release file of the pinned asset. The binary release file must hold a file named moai at its top.
// The binary is an executable that the release pins; the build copies it as the binary release file holds it.
export function buildBinary({ file, sha256, out }) {
  const digest = createHash("sha256").update(readFileSync(file)).digest("hex");
  if (digest !== sha256) throw new Error(`binary release file sha256 ${digest} does not match the pinned ${sha256}: ${file}`);
  const work = mkdtempSync(join(tmpdir(), "moai-binary-"));
  try {
    execFileSync("tar", ["-xzf", file, "-C", work]);
    const source = join(work, "moai");
    if (!existsSync(source)) throw new Error(`binary release file holds no moai file at its top: ${file}`);
    // moai-adk is Apache-2.0: the redistributed binary carries the LICENSE of its release file, and the NOTICE when the release file has one.
    const license = join(work, "LICENSE");
    if (!existsSync(license)) throw new Error(`binary release file holds no LICENSE at its top: ${file}`);
    rmSync(join(out, "bin"), { recursive: true, force: true });
    mkdirSync(join(out, "bin"), { recursive: true });
    copyFileSync(source, join(out, "bin", "moai"));
    chmodSync(join(out, "bin", "moai"), 0o755);
    copyFileSync(license, join(out, "bin", "moai.LICENSE"));
    const notice = join(work, "NOTICE");
    if (existsSync(notice)) copyFileSync(notice, join(out, "bin", "moai.NOTICE"));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

// buildRelease writes maker/, plugin/ and bin/ under out from the release file of the pinned release and the pinned binary release file.
export function buildRelease({ releaseFile, sha256, version, out, binary }) {
  if (typeof version !== "string" || version === "") throw new Error("buildRelease requires the release version");
  if (binary === undefined) throw new Error("buildRelease requires the binary release file of the pinned asset");
  const digest = createHash("sha256").update(readFileSync(releaseFile)).digest("hex");
  if (digest !== sha256) throw new Error(`release file sha256 ${digest} does not match the pinned ${sha256}: ${releaseFile}`);
  buildBinary({ file: binary.file, sha256: binary.sha256, out });

  const work = mkdtempSync(join(tmpdir(), "moai-release-"));
  try {
    execFileSync("tar", ["-xzf", releaseFile, "-C", work]);
    const top = readdirSync(work);
    if (top.length !== 1) throw new Error(`release file must hold one top folder, found: ${top.join(", ")}`);
    const claude = join(work, top[0], ".claude");

    rmSync(join(out, "maker"), { recursive: true, force: true });
    rmSync(join(out, "plugin"), { recursive: true, force: true });

    // agents: .claude/agents/moai/*.md
    const agentSource = join(claude, "agents", "moai");
    const agentDest = join(out, "maker", "agents", "moai");
    mkdirSync(agentDest, { recursive: true });
    const agents = readdirSync(agentSource)
      .filter((file) => file.endsWith(".md"))
      .sort()
      .map((file) => {
        const text = readFileSync(join(agentSource, file), "utf8");
        const { name, model } = frontmatterFields(`agents/moai/${file}`, text);
        writeFileSync(join(agentDest, file), withoutModel(text));
        const path = `agents/moai/${file}`;
        return model === undefined ? { name, path, cli: "claude" } : { name, path, cli: "claude", model };
      });

    // skills: .claude/skills/moai*/ that hold a SKILL.md
    const skillSource = join(claude, "skills");
    const skills = readdirSync(skillSource)
      .filter((name) => name.startsWith("moai") && existsSync(join(skillSource, name, "SKILL.md")))
      .sort();
    for (const name of skills) cpSync(join(skillSource, name), join(out, "maker", "skills", name), { recursive: true });
    writeFileSync(join(out, "maker", "index.json"), `${JSON.stringify({ agents, skills: skills.map((name) => `skills/${name}`) }, null, 2)}\n`);

    // settings: the registrations go to plugin/hooks/hooks.json, the rest to maker/settings.json
    const settings = JSON.parse(readFileSync(join(claude, "settings.json"), "utf8"));
    const { hooks = {}, ...rest } = settings;
    const scripts = new Set();
    const moved = transformHooks(hooks, scripts);
    const hookDest = join(out, "plugin", "hooks", "moai");
    mkdirSync(hookDest, { recursive: true });
    for (const script of [...scripts].sort()) {
      const source = join(claude, "hooks", "moai", script);
      if (!existsSync(source)) throw new Error(`hook script is missing from the release: hooks/moai/${script}`);
      cpSync(source, join(hookDest, script));
    }
    writeFileSync(join(out, "plugin", "hooks", "hooks.json"), `${JSON.stringify({ hooks: moved }, null, 2)}\n`);
    writeFileSync(join(out, "maker", "settings.json"), `${JSON.stringify(rest, null, 2)}\n`);

    // seed: the release .moai folder, shipped unrendered; the page renders its templates with the project values
    const seedSource = join(work, top[0], "internal", "template", "templates", ".moai");
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

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith("--") || argv[i + 1] === undefined) throw new Error(`usage: build-release.mjs [--release-file <file>] [--binary-file <file>] [--out <folder>]`);
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
  let binaryFile = args["binary-file"];
  if (!binaryFile) {
    const response = await fetch(pin.binary.url);
    if (!response.ok) throw new Error(`fetch ${pin.binary.url}: HTTP ${response.status}`);
    const folder = mkdtempSync(join(tmpdir(), "moai-binary-file-"));
    binaryFile = join(folder, basename(pin.binary.url));
    writeFileSync(binaryFile, Buffer.from(await response.arrayBuffer()));
  }
  buildRelease({
    releaseFile,
    sha256: pin.sha256,
    version: pin.tag,
    out: args.out ?? ROOT,
    binary: { file: binaryFile, sha256: pin.binary.sha256 },
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
