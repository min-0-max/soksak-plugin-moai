// The moai group that this plugin contributes to the extension point agents.makers of the agents plugin
// (agents docs/spec/makers.md). The agents plugin imports this module and calls group() for each connected item.
// The release build writes maker/index.js, a data module with the agents, the skill folders and the files of the
// corrected copy, each file with its project path. group() imports that module through the plugin modules path.
// A JSON schema library is not used here, because this module is loaded directly by the page and bundles no library.

const INDEX_URL = new URL("../../maker/index.js", import.meta.url);

// The project folders that the group creates; every file path lies inside one of them (agents docs/spec/makers.md).
const FOLDERS = [".moai/", ".claude/"];

// Imports the shipped data module and returns the group object. A missing module or a mismatch rejects with an error
// that names the module and the field.
export async function group() {
  return groupFrom(await import(INDEX_URL.href));
}

// Builds the group from a data module namespace with the members agents, skills and files.
export function groupFrom(index) {
  if (!isObject(index)) fail("module", "must export agents, skills and files");
  const files = checkFiles(index);
  const agents = checkAgents(index, files);
  const skills = checkSkills(index);
  return Object.freeze({
    id: "moai",
    name: "moai",
    plugin: "plugin",
    clis: ["claude"],
    agents,
    skills,
    variables: Object.freeze({ MOAI_HOME: "{home}/.moai" }),
    path: ["bin"],
    folders: [...FOLDERS],
    rules: ["Write the outputs of moai only under `.moai/`."],
    files,
  });
}

function fail(field, reason) {
  throw new Error(`maker/index.js: ${field} ${reason}`);
}

// Each entry holds a project path inside a folder of FOLDERS and the corrected text of the file; a path is unique.
function checkFiles(index) {
  if (!Array.isArray(index.files)) fail("files", "must be an array");
  const seen = new Set();
  return index.files.map((file, i) => {
    const field = `files[${i}]`;
    if (!isObject(file)) fail(field, "must be an object");
    if (typeof file.path !== "string" || !FOLDERS.some((folder) => file.path.startsWith(folder)) || !hasPlainSegments(file.path)) {
      fail(`${field}.path`, `${String(file.path)} is not a relative path inside ${FOLDERS.join(" or ")}`);
    }
    if (seen.has(file.path)) fail(`${field}.path`, `${file.path} repeats an earlier entry`);
    seen.add(file.path);
    if (typeof file.text !== "string") fail(`${field}.text`, "must be a string");
    return { path: file.path, text: file.text };
  });
}

// Each agent path names an entry of files, and the agent model is kept when present (agents applies it to the session).
function checkAgents(index, files) {
  if (!Array.isArray(index.agents)) fail("agents", "must be an array");
  const paths = new Set(files.map((file) => file.path));
  return index.agents.map((agent, i) => {
    const field = `agents[${i}]`;
    if (!isObject(agent)) fail(field, "must be an object");
    if (typeof agent.name !== "string" || agent.name === "") fail(`${field}.name`, "must be a non-empty string");
    if (typeof agent.path !== "string" || !paths.has(agent.path)) {
      fail(`${field}.path`, `${String(agent.path)} names no entry of files`);
    }
    if (agent.cli !== "claude") fail(`${field}.cli`, "must be claude");
    if (agent.model !== undefined && (typeof agent.model !== "string" || agent.model === "")) {
      fail(`${field}.model`, "must be a non-empty string when present");
    }
    return agent.model === undefined
      ? { name: agent.name, path: agent.path, cli: agent.cli }
      : { name: agent.name, path: agent.path, cli: agent.cli, model: agent.model };
  });
}

function checkSkills(index) {
  if (!Array.isArray(index.skills)) fail("skills", "must be an array");
  return index.skills.map((skill, i) => {
    if (!isRelativeFolder(skill, ".claude/skills/")) fail(`skills[${i}]`, "must be a project folder under .claude/skills/");
    return skill;
  });
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRelativeFolder(value, prefix) {
  return typeof value === "string" && value.startsWith(prefix) && value.length > prefix.length && hasPlainSegments(value);
}

// A path is relative, has no empty, . or .. segment and no leading slash.
function hasPlainSegments(value) {
  return !value.startsWith("/") && value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}
