// The moai group that this plugin contributes to the extension point agents.makers of the agents plugin
// (agents docs/spec/makers.md). The release build bundles this module with the data module maker/index.js into
// maker/moai.js, one file with no import, because core grants a provider page only the contributed module file
// (scripts/build-release.mjs). The agents plugin imports that file and calls group() for each connected item.
// A JSON schema library is not used here, because the bundle holds only this module and the data.

// The maker folder of the release, relative to the installed folder of the plugin: a session loads it with --plugin-dir and --add-dir.
const PLUGIN = "plugin";
// The project folders that the agents of the group write: the outputs of moai and the agent memory that `memory: project` keeps.
const FOLDERS = [".moai/", ".claude/agent-memory/"];

// Builds the group from a data module namespace with the member agents.
export function groupFrom(index) {
  if (!isObject(index)) fail("module", "must export agents");
  const unknown = Object.keys(index).find((key) => key !== "agents");
  if (unknown !== undefined) fail(unknown, "is not a member of the data module");
  const agents = checkAgents(index);
  return Object.freeze({
    id: "moai",
    name: "moai",
    plugin: PLUGIN,
    clis: ["claude"],
    agents,
    // MOAI_PLUGIN names the maker folder for the agent hooks, which run without CLAUDE_PLUGIN_ROOT.
    variables: Object.freeze({ MOAI_HOME: "{home}/.moai", MOAI_PLUGIN: "{plugin}" }),
    folders: [...FOLDERS],
    rules: ["Write the outputs of moai only under `.moai/`."],
  });
}

function fail(field, reason) {
  throw new Error(`maker/index.js: ${field} ${reason}`);
}

// Each agent names its definition file in the maker folder under .claude/agents/; the agent model is kept when present (agents applies
// it to the session).
function checkAgents(index) {
  if (!Array.isArray(index.agents)) fail("agents", "must be an array");
  return index.agents.map((agent, i) => {
    const field = `agents[${i}]`;
    if (!isObject(agent)) fail(field, "must be an object");
    if (typeof agent.name !== "string" || agent.name === "") fail(`${field}.name`, "must be a non-empty string");
    if (typeof agent.path !== "string" || !agent.path.startsWith(".claude/agents/") || !agent.path.endsWith(".md") || !hasPlainSegments(agent.path)) {
      fail(`${field}.path`, `${String(agent.path)} is not a Markdown file under .claude/agents/ of the maker folder`);
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

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// A path is relative, has no empty, . or .. segment and no leading slash.
function hasPlainSegments(value) {
  return !value.startsWith("/") && value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}
