// The request and reply model of the moai surface. Requests and replies are the list and watch operations of the files sidecar
// (core docs/spec/sidecars.md, sidecar @soksak/sidecar-files); the project root is the root of the sidecar session.

export const SPECS_PATH = ".moai/specs";
const SPEC_FOLDER = /^SPEC-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

// The paths that the page may watch: the moai folder, its state and SPEC folders, and the state folders of the records. A watch
// is not recursive, so each folder that holds records is listed. The page watches the candidates that exist.
export const WATCH_CANDIDATES = [".moai", ".moai/state", SPECS_PATH, ".moai/state/todo", ".moai/state/goal", ".moai/state/verify"];

// watchPathsOf returns the candidates that exist, in candidate order. With none, it returns the project root, so that the creation of
// the moai folder is reported.
export function watchPathsOf(existing) {
  const paths = WATCH_CANDIDATES.filter((path) => existing.includes(path));
  return paths.length > 0 ? paths : [""];
}

// The watch request of a set of paths. The sidecar then sends {changed} without id for each change of an entry of a watched folder.
export function watchSpecsRequest(id, paths) {
  return { operation: "watch", id, paths };
}

// The list request of one folder, relative to the project root. The id correlates the reply with this request.
export function listRequest(id, path) {
  return { operation: "list", id, path };
}

// The list request of the SPEC folder.
export function listSpecsRequest(id) {
  return listRequest(id, SPECS_PATH);
}

// The SPEC folder names of a list reply in name order. A failed reply throws its error text; a reply without entries throws
// an error that names the field, because the sidecar contract always answers entries for a list.
export function specIds(reply) {
  if (typeof reply !== "object" || reply === null) {
    throw new Error("files sidecar list reply must be an object");
  }
  if (typeof reply.error === "string") {
    throw new Error(reply.error);
  }
  if (!Array.isArray(reply.entries)) {
    throw new Error("files sidecar list reply has no entries");
  }
  return reply.entries
    .filter((entry) => entry.directory === true && SPEC_FOLDER.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}
