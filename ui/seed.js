// Seeds the .moai folder of the project when the moai page starts. The page lists the project through the files sidecar, writes
// each seed file that the project lacks, and leaves the others as they are; a complete seed writes nothing, and init never runs.
// request(makeBody) sends one files sidecar request and resolves with its reply body; makeBody receives the request id.
// readIndex() resolves with the text of maker/seed/index.json, and readSeed(seedFile) with the text of a file of the release seed.
import { gitValues, templateValues } from "./seed-model.js";
import { createFolderRequest, localeOf, planSeed, projectNameOf, renderSeedFile, seedDirectories, writeRequest } from "./seed-plan.js";

// The shell of the agent process expands MOAI_HOME, which the group sets, so the path needs no home folder of the account.
const RESOLVED_MOAI_PATH = "$MOAI_HOME/bin/moai";

export async function seedMoaiProject({ request, project, language, now, readIndex, readSeed }) {
  if (!project) throw new Error("moai seed needs a project; the window shows none");
  const projectName = projectNameOf(project.root);
  const index = seedIndex(await readIndex());
  const existing = await existingSeedFiles(request, seedDirectories(index.files));
  const plan = planSeed({ files: index.files, existing });
  // The values are read and checked before the first write, so an invalid value writes no file.
  const values = plan.writes.some((file) => file.endsWith(".tmpl"))
    ? templateValues({
        projectName,
        locale: localeOf(language),
        git: gitValues(await gitConfig(request)),
        createdAt: now().toISOString(),
        version: index.version,
        groupBinPath: RESOLVED_MOAI_PATH,
      })
    : null;
  // A folder is created only when a file is missing in it, so a complete seed sends no createFolder request.
  for (const folder of seedDirectories(plan.writes)) {
    await request((id) => createFolderRequest(id, folder));
  }
  const written = [];
  for (const file of plan.writes) {
    const rendered = renderSeedFile(file, await readSeed(file), values);
    await request((id) => writeRequest(id, rendered.path, rendered.text)).catch((error) => {
      throw new Error(`moai seed could not write ${rendered.path}: ${error.message}`);
    });
    written.push(rendered.path);
  }
  return { written, kept: plan.kept };
}

// seedIndex reads maker/seed/index.json, which the release build writes. A file of another form is an error.
function seedIndex(text) {
  const index = JSON.parse(text);
  if (typeof index?.version !== "string" || index.version === "") throw new Error("maker/seed/index.json has no version");
  if (!Array.isArray(index.files) || index.files.some((file) => typeof file !== "string" || file === "")) {
    throw new Error("maker/seed/index.json files is not a list of paths");
  }
  return index;
}

// Lists the directories of the seed that exist, from the project root down, and returns the files of those folders.
async function existingSeedFiles(request, directories) {
  const wanted = new Set(directories);
  const found = [];
  async function visit(folder) {
    for (const entry of await listFolder(request, folder)) {
      const path = folder === "" ? entry.name : `${folder}/${entry.name}`;
      if (!entry.directory) found.push(path);
      else if (wanted.has(path)) await visit(path);
    }
  }
  await visit("");
  return found;
}

function listFolder(request, path) {
  return request((id) => ({ operation: "list", id, path })).then((reply) => reply.entries);
}

// The text of .git/config, or null when the project has no git config file (no remote). A .git that is not a folder is an error.
async function gitConfig(request) {
  const root = await listFolder(request, "");
  const git = root.find((entry) => entry.name === ".git");
  if (!git) return null;
  if (!git.directory) throw new Error("moai seed cannot read the git remote: .git is not a folder");
  const config = (await listFolder(request, ".git")).find((entry) => entry.name === "config");
  if (!config) return null;
  if (config.directory) throw new Error("moai seed cannot read the git remote: .git/config is a folder");
  const reply = await request((id) => ({ operation: "read", id, path: ".git/config" }));
  return reply.text;
}
