// The moai surface page: lists the SPEC folders of the project through the files sidecar, and lists again on each change
// that the sidecar reports. The page starts no timer: every update comes from a reply or a sidecar event.
import { createViewBridge } from "@soksak/plugin-api/view";
import { firstWatchPath, listSpecsRequest, nextWatchPath, specIds, watchSpecsRequest } from "./specs-model.js";

const SIDECAR = "@soksak/sidecar-files";

// Errors of this page go through the one display path of the view: the bridge writes each one to the application log.
const bridge = createViewBridge({
  handler: window.webkit.messageHandlers["sok-view"],
  report: (event) => {
    if (event.kind === "open-calls") return;
    showError(event.where ?? "moai specs", event.text ?? event.kind);
  },
});

const surface = window.sokSurface.surface;
const sidecar = bridge.runtime.sidecar(SIDECAR);
const list = document.getElementById("specs");
let counter = 0;
let watchId = null;
let watchPath = null;
let listId = null;

function nextId(prefix) {
  counter += 1;
  return `${prefix}-${counter}`;
}

function showError(where, error) {
  const text = error instanceof Error ? error.message : String(error);
  bridge.runtime.error(where, text).catch((failure) => console.error(`moai specs could not write an error: ${failure}`));
}

function render(ids) {
  list.replaceChildren(...ids.map((id) => {
    const item = document.createElement("li");
    item.textContent = id;
    return item;
  }));
}

// Requests the SPEC list. A reply answers the latest request only; an earlier reply is stale and is dropped.
function requestList() {
  listId = nextId("list");
  sidecar.send(surface, listSpecsRequest(listId), []).catch((error) => showError("moai specs", error));
}

// Watches the first path of the chain from firstWatchPath on. A failed watch request moves to the next path.
function requestWatch(path) {
  watchPath = path;
  watchId = nextId("watch");
  sidecar.send(surface, watchSpecsRequest(watchId, path), []).catch((error) => showError("moai specs", error));
}

function onWatchReply(body) {
  if (typeof body.error === "string") {
    const next = nextWatchPath(watchPath);
    if (next === null) {
      showError("moai specs", new Error(`files sidecar could not watch the project root: ${body.error}`));
      return;
    }
    requestWatch(next);
    return;
  }
  requestList();
}

function onMessage(body) {
  if (!body || typeof body !== "object") {
    showError("moai specs", new Error("files sidecar message must be an object"));
    return;
  }
  // A change of a watched entry: the page lists again, and starts the watch chain again so that a created folder is watched.
  if (Object.hasOwn(body, "changed")) {
    requestWatch(firstWatchPath());
    return;
  }
  // A watch failure after it started answers no request and carries no id.
  if (!Object.hasOwn(body, "id")) {
    showError("moai specs", new Error(`files sidecar watch failed: ${String(body.error ?? "no error text")}`));
    return;
  }
  if (body.id === watchId) {
    onWatchReply(body);
    return;
  }
  if (body.id === listId) {
    try {
      render(specIds(body));
    } catch (error) {
      showError("moai specs", error);
    }
  }
}

async function start() {
  await sidecar.on(surface, (body) => onMessage(body));
  await sidecar.onFailure(surface, (failure) => showError("moai specs", new Error(`files sidecar failed: ${failure}`)));
  requestWatch(firstWatchPath());
}

start().catch((error) => showError("moai specs", error));
