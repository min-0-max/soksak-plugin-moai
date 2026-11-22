// The moai group that this plugin contributes to the extension point agents.makers of the agents plugin
// (agents docs/spec/makers.md). The agents plugin imports this module and calls group() for each connected item.
// The release build writes maker/index.json next to this plugin's modules folder, with the agents and skills of the
// corrected copy. group() reads that shipped index through the plugin modules path, so the lists follow the release.
// A JSON schema library is not used here, because this module is loaded directly by the page and bundles no library.

const INDEX_URL = new URL("../../maker/index.json", import.meta.url);

// Reads the shipped index and returns the group object. A failed read or a mismatch of the index rejects with an error
// that names the index and the field.
export async function group() {
  return groupFromIndex(INDEX_URL);
}

// Builds the group from the index at indexUrl. group() passes the shipped index; a test passes a release-shaped fixture.
export async function groupFromIndex(indexUrl) {
  const response = await fetch(indexUrl);
  if (!response.ok) {
    throw new Error(`${indexUrl}: the index is not readable (HTTP ${response.status})`);
  }
  const index = await response.json();
  const agents = checkAgents(indexUrl, index);
  const skills = checkSkills(indexUrl, index);
  return Object.freeze({
    id: "moai",
    name: "moai",
    plugin: "plugin",
    clis: ["claude"],
    agents,
    skills,
    variables: Object.freeze({ MOAI_HOME: "{home}/.moai" }),
    path: ["bin"],
    folders: [".moai/"],
    rules: ["Write the outputs of moai only under `.moai/`."],
  });
}

function fail(indexUrl, field, reason) {
  throw new Error(`${indexUrl}: ${field} ${reason}`);
}

function checkAgents(indexUrl, index) {
  if (!isObject(index) || !Array.isArray(index.agents)) {
    fail(indexUrl, "agents", "must be an array");
  }
  return index.agents.map((agent, i) => {
    const field = `agents[${i}]`;
    if (!isObject(agent)) {
      fail(indexUrl, field, "must be an object");
    }
    if (typeof agent.name !== "string" || agent.name === "") {
      fail(indexUrl, `${field}.name`, "must be a non-empty string");
    }
    if (!isRelativeFile(agent.path, "agents/", ".md")) {
      fail(indexUrl, `${field}.path`, "must be a relative path under agents/ that ends in .md");
    }
    if (agent.cli !== "claude") {
      fail(indexUrl, `${field}.cli`, "must be claude");
    }
    return { name: agent.name, path: agent.path, cli: agent.cli };
  });
}

function checkSkills(indexUrl, index) {
  if (!Array.isArray(index.skills)) {
    fail(indexUrl, "skills", "must be an array");
  }
  return index.skills.map((skill, i) => {
    if (!isRelativeFolder(skill, "skills/")) {
      fail(indexUrl, `skills[${i}]`, "must be a relative folder under skills/");
    }
    return skill;
  });
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// A path is relative, has no empty, . or .. segment, stays under the prefix and ends with the suffix.
function isRelativeFile(value, prefix, suffix) {
  return typeof value === "string" && value.startsWith(prefix) && value.endsWith(suffix) && hasPlainSegments(value);
}

function isRelativeFolder(value, prefix) {
  return typeof value === "string" && value.startsWith(prefix) && value.length > prefix.length && hasPlainSegments(value);
}

function hasPlainSegments(value) {
  return !value.startsWith("/") && value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}
