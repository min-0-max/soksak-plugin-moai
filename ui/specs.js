// The moai surface page: lists the SPEC folders of the project through the files sidecar, and lists again on each change
// that the sidecar reports. The page starts no timer: every update comes from a reply or a sidecar event.
import { createViewBridge } from "@soksak/plugin-api/view";
import { seedMoaiProject } from "./seed.js";
import { programStdout } from "./program-reply.js";
import { firstWatchPath, listSpecsRequest, nextWatchPath, specIds, watchSpecsRequest } from "./specs-model.js";
import { specDetailRows } from "./spec-detail-model.js";
import { readSpecRequest } from "./spec-frontmatter.js";

const SIDECAR = "@soksak/sidecar-files";
// The declared program of plugin.json that prints the MUST-FIX drift findings of the SPECs (docs/spec/native-surfaces.md#program-runs).
const SPEC_AUDIT_PROGRAM = "spec-audit";

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
const seedReport = document.getElementById("seed");
const detail = document.getElementById("detail");
// Requests of the seed wait for their reply by id; the watch and list replies keep their own handlers.
const pending = new Map();
let counter = 0;
let watchId = null;
let watchPath = null;
let listId = null;
// Each refresh of the detail rows takes a number; a refresh that ends after a later one began is dropped.
let detailGeneration = 0;

function nextId(prefix) {
  counter += 1;
  return `${prefix}-${counter}`;
}

function showError(where, error) {
  const text = error instanceof Error ? error.message : String(error);
  bridge.runtime.error(where, text).catch((failure) => console.error(`moai specs could not write an error: ${failure}`));
}

// request sends one files sidecar request of the seed and resolves with the reply body that carries its id.
function request(makeBody) {
  const id = nextId("seed");
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    sidecar.send(surface, makeBody(id), []).catch((error) => {
      pending.delete(id);
      reject(error);
    });
  });
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

// Seeds the project's .moai folder once per page start. The report names what was written and what was kept.
function seedProject() {
  return seedMoaiProject({
    request,
    project: window.sokSurface.project,
    language: navigator.language,
    now: () => new Date(),
    readIndex: () => fetchText(new URL("../maker/seed/index.json", import.meta.url)),
    readSeed: (file) => fetchText(new URL(`../maker/seed/.moai/${file}`, import.meta.url)),
  }).then(({ written, kept }) => {
    seedReport.textContent = `moai seed: wrote ${written.length} files, kept ${kept.length} existing.`;
  });
}

// Reads the spec.md of each folder and runs the audit, then shows one row per SPEC. A row error goes through showError, the one
// display path of the page; the rows show no error text of their own.
async function refreshDetail(folders) {
  const generation = ++detailGeneration;
  const documents = new Map();
  await Promise.all(folders.map(async (folder) => {
    try {
      const body = await request((id) => readSpecRequest(id, folder));
      documents.set(folder, { text: body.text });
    } catch (error) {
      documents.set(folder, { error: error.message });
    }
  }));
  const auditText = programStdout(SPEC_AUDIT_PROGRAM, await bridge.runtime.program.run(SPEC_AUDIT_PROGRAM, []));
  if (generation !== detailGeneration) return;
  const rows = specDetailRows(folders, documents, auditText);
  detail.replaceChildren(...rows.map((row) => {
    const item = document.createElement("li");
    item.textContent = [row.id, row.title, row.status].filter((text) => text !== "").join("  ");
    const fixes = document.createElement("ul");
    fixes.replaceChildren(...row.mustFix.map((text) => {
      const fix = document.createElement("li");
      fix.textContent = text;
      return fix;
    }));
    item.append(fixes);
    return item;
  }));
  for (const row of rows) {
    if (row.error !== null) showError(`moai spec ${row.folder}`, new Error(row.error));
  }
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
  if (typeof body.id === "string" && pending.has(body.id)) {
    const waiter = pending.get(body.id);
    pending.delete(body.id);
    if (typeof body.error === "string") waiter.reject(new Error(body.error));
    else waiter.resolve(body);
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
    let ids;
    try {
      ids = specIds(body);
    } catch (error) {
      showError("moai specs", error);
      return;
    }
    render(ids);
    refreshDetail(ids).catch((error) => showError("moai spec audit", error));
  }
}

async function start() {
  await sidecar.on(surface, (body) => onMessage(body));
  await sidecar.onFailure(surface, (failure) => showError("moai specs", new Error(`files sidecar failed: ${failure}`)));
  requestWatch(firstWatchPath());
  seedProject().catch((error) => showError("moai seed", error));
}

start().catch((error) => showError("moai specs", error));
