// The SPEC list model of the moai surface. Its requests and replies are the list operation of the files sidecar
// (core docs/spec/sidecars.md, sidecar @soksak/sidecar-files); the project root is the root of the sidecar session.

const SPECS_PATH = ".moai/specs";
const SPEC_FOLDER = /^SPEC-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

// The paths that the page watches, from the most specific to the project root. The files sidecar watch fails for a path that
// does not exist, so the page watches the first path of the chain that exists, and moves to the next one when the watch fails.
const WATCH_CHAIN = [SPECS_PATH, ".moai", ""];

// The watch request of one path of the chain. The sidecar then sends {changed} without id for each change of its entries.
export function watchSpecsRequest(id, path) {
  return { operation: "watch", id, paths: [path] };
}

// The path of the chain that follows path, or null after the project root.
export function nextWatchPath(path) {
  const index = WATCH_CHAIN.indexOf(path);
  if (index < 0) {
    throw new Error(`watch path ${JSON.stringify(path)} is not in the watch chain`);
  }
  return index + 1 < WATCH_CHAIN.length ? WATCH_CHAIN[index + 1] : null;
}

export function firstWatchPath() {
  return WATCH_CHAIN[0];
}

// The list request of the SPEC folder. The id correlates the reply with this request.
export function listSpecsRequest(id) {
  return { operation: "list", id, path: SPECS_PATH };
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
