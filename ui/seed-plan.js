// The seed plan of the moai group: which files of the release seed the project lacks, the project path and the text of each,
// and the files sidecar request that writes it. The seed is the .moai folder of the release (maker/seed/index.json lists it).
// The page reads the project and the sidecar replies; this module decides from them and builds no request that reads.
import { renderTemplate } from "./seed-model.js";

const MOAI = ".moai";
const TEMPLATE = ".tmpl";

// targetPath is the project path of a seed file: its path under .moai, with the .tmpl suffix of a template removed.
export function targetPath(seedFile) {
  return `${MOAI}/${seedFile.endsWith(TEMPLATE) ? seedFile.slice(0, -TEMPLATE.length) : seedFile}`;
}

// seedDirectories lists each directory that holds a seed file, as a project path, the shallowest first.
export function seedDirectories(files) {
  const directories = new Set();
  for (const file of files) {
    const parts = targetPath(file).split("/");
    for (let depth = 1; depth < parts.length; depth += 1) directories.add(parts.slice(0, depth).join("/"));
  }
  return [...directories].sort((a, b) => a.split("/").length - b.split("/").length || (a < b ? -1 : a > b ? 1 : 0));
}

// planSeed takes the seed files and the project paths that exist. It writes the seed files whose project path is absent and
// keeps the others; a complete seed gives no writes, so a second run changes nothing.
export function planSeed({ files, existing }) {
  const present = new Set(existing);
  return {
    writes: files.filter((file) => !present.has(targetPath(file))),
    kept: files.map(targetPath).filter((path) => present.has(path)),
  };
}

// renderSeedFile gives the project path and the text of a seed file: a template is rendered with the values, any other file
// is copied unchanged.
export function renderSeedFile(seedFile, text, values) {
  const rendered = seedFile.endsWith(TEMPLATE) ? renderTemplate(text, values) : text;
  return { path: targetPath(seedFile), text: rendered };
}

// localeOf is the moai language of a navigator language tag: its primary subtag, such as `ko` for `ko-KR`. The language set is
// checked by templateValues, which names a language that moai does not name.
export function localeOf(language) {
  if (typeof language !== "string" || language === "") throw new Error("navigator language is empty");
  return language.split("-")[0].toLowerCase();
}

// projectNameOf is the last folder of the project root, which is the ProjectName value of the seed.
export function projectNameOf(root) {
  const name = String(root ?? "").replace(/\/+$/, "").split("/").pop();
  if (name === undefined || name === "") throw new Error("project root is empty");
  return name;
}

// writeRequest is the files sidecar write of a new file. `expect: null` is required by the sidecar, which refuses a write
// without an expected version and refuses a path that already exists.
export function writeRequest(id, path, text) {
  return { operation: "write", id, path, text, bom: false, expect: null };
}

// createFolderRequest is the files sidecar createFolder of a folder of the project. The sidecar creates the missing parents too,
// and answers success for a folder that exists, so a repeated request changes nothing.
export function createFolderRequest(id, path) {
  return { operation: "createFolder", id, path };
}
