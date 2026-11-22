// The moai surface page: lists the SPEC folders of the project through the files sidecar, and lists again on each change
// that the sidecar reports. The page starts no timer: every update comes from a reply or a sidecar event.
import { createViewBridge } from "@soksak/plugin-api/view";
import { seedMoaiProject } from "./seed.js";
import { programStdout } from "./program-reply.js";
import { listRequest, SPECS_PATH, specIds, watchPathsOf, watchSpecsRequest, WATCH_CANDIDATES } from "./specs-model.js";
import { recordRows, STATE_FOLDERS } from "./state-records.js";
import { specDetailRows } from "./spec-detail-model.js";
import { checkSectionText, CHECKED_SECTIONS, parseSettingValue } from "./section-check.js";
import { group } from "../maker/moai.js";
import { moaiTabs } from "./moai-tabs.js";
import { saveSection } from "./section-save.js";
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
const settingsForm = document.getElementById("settings");
const settingsSection = document.getElementById("settings-section");
const settingsKey = document.getElementById("settings-key");
const settingsValue = document.getElementById("settings-value");
const settingsSave = document.getElementById("settings-save");
const settingsStatus = document.getElementById("settings-status");
const overviewSummary = document.getElementById("overview-summary");
const overviewTabs = document.getElementById("overview-tabs");
const factorySummary = document.getElementById("factory-summary");
const factoryRecords = document.getElementById("factory-records");
const monitorSummary = document.getElementById("monitor-summary");
const monitorRecords = document.getElementById("monitor-records");
// The agent names of the moai group, read once from the shipped index, and the last core.grid value of the tabs.
let agentNames = null;
let lastGrid = null;
// The MUST-FIX findings of the last audit run, or null before the first run.
let mustFixTotal = null;
// Requests of the seed wait for their reply by id; the watch and list replies keep their own handlers.
const pending = new Map();
let counter = 0;
// Each refresh of the detail rows and of the refresh cycle takes a number; a cycle that ends after a later one began is dropped.
let detailGeneration = 0;
let refreshGeneration = 0;

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
  mustFixTotal = rows.reduce((total, row) => total + row.mustFix.length, 0);
  renderOverview();
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

// Shows the moai tabs of core.grid with their program state, and the MUST-FIX findings of the last audit. Each change of core.grid
// (watched as a core status) and each audit run renders again; nothing renders on a timer.
function renderOverview() {
  if (agentNames === null || lastGrid === null) return;
  const rows = moaiTabs(lastGrid, agentNames);
  const live = rows.filter((row) => row.live).length;
  const findings = mustFixTotal === null ? "not audited yet" : `${mustFixTotal}`;
  overviewSummary.textContent = `moai tabs: ${rows.length}, live: ${live}, MUST-FIX findings: ${findings}`;
  overviewTabs.replaceChildren(...rows.map((row) => {
    const item = document.createElement("li");
    item.textContent = `${row.title} (${row.role}): ${row.state ?? "no program state"}`;
    return item;
  }));
}

function render(ids) {
  list.replaceChildren(...ids.map((id) => {
    const item = document.createElement("li");
    item.textContent = id;
    return item;
  }));
}

// Lists one moai folder. A folder that the sidecar reports as missing is absent, which is the answer for a project without that
// folder; any other error is shown through the page error path and the folder counts as absent.
async function listFolder(path) {
  try {
    return await request((id) => listRequest(id, path));
  } catch (error) {
    if (!/no such file/.test(error.message)) showError("moai list", error);
    return null;
  }
}

// Reads the files of one record folder: the file name and its text, and a read error keeps its row with the error text.
async function readRecords(folder, listing) {
  const files = listing.entries.filter((entry) => entry.directory === false);
  return Promise.all(files.map(async (entry) => {
    const path = `${folder}/${entry.name}`;
    try {
      const body = await request((id) => ({ operation: "read", id, path }));
      return { name: entry.name, text: body.text };
    } catch (error) {
      return { name: entry.name, text: null, readError: error.message };
    }
  }));
}

// The tab summary of the screens of records: the moai tabs of core.grid, with the live ones. A record is not joined to a tab, because
// no contract names the session of a tab.
function tabSummary() {
  if (agentNames === null || lastGrid === null) return "moai tabs not known yet";
  const rows = moaiTabs(lastGrid, agentNames);
  return `moai tabs: ${rows.length}, live: ${rows.filter((row) => row.live).length}`;
}

// Renders the records of one screen. A record that cannot be read or parsed keeps its row, and its error goes through showError.
function renderRecords(summary, list, title, rows) {
  summary.textContent = `${title}: ${rows.length} records; ${tabSummary()}; records are not joined to tabs`;
  list.replaceChildren(...rows.map((row) => {
    const item = document.createElement("li");
    item.textContent = `${row.name}: ${row.error ?? JSON.stringify(row.value)}`;
    return item;
  }));
  for (const row of rows) {
    if (row.error !== null) showError(`moai ${title} ${row.name}`, new Error(row.error));
  }
}

// One refresh cycle: list the moai folders, watch the ones that exist, read the records and the SPECs, and render each screen from
// the replies. Each sidecar change starts a cycle; no timer starts one.
async function refresh() {
  const generation = ++refreshGeneration;
  const listings = new Map();
  for (const path of WATCH_CANDIDATES) listings.set(path, await listFolder(path));
  const existing = WATCH_CANDIDATES.filter((path) => listings.get(path) !== null);
  await request((id) => watchSpecsRequest(id, watchPathsOf(existing)));
  const specListing = listings.get(SPECS_PATH);
  const specs = specListing === null ? [] : specIds(specListing);
  const records = {};
  for (const [kind, folder] of Object.entries(STATE_FOLDERS)) {
    const listing = listings.get(folder);
    records[kind] = listing === null ? [] : await readRecords(folder, listing);
  }
  if (generation !== refreshGeneration) return;
  render(specs);
  renderRecords(factorySummary, factoryRecords, "factory", recordRows(records.todo));
  const monitorFiles = [
    ...records.goal.map((file) => ({ ...file, name: `goal/${file.name}` })),
    ...records.verify.map((file) => ({ ...file, name: `verify/${file.name}` })),
  ];
  renderRecords(monitorSummary, monitorRecords, "monitor", recordRows(monitorFiles));
  refreshDetail(specs).catch((error) => showError("moai spec audit", error));
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
  // A change of a watched entry: a new cycle lists, watches and renders again, so a created folder is watched too.
  if (Object.hasOwn(body, "changed")) {
    refresh().catch((error) => showError("moai refresh", error));
    return;
  }
  // A watch failure after it started answers no request and carries no id.
  showError("moai specs", new Error(`files sidecar watch failed: ${String(body.error ?? "no error text")}`));
}

// Saves one value of a section file: the key names the section and the field path, as quality.test_coverage_target does. The file
// is checked before the write, and the moai load runs after it; a failed check or load leaves the previous text in place.
async function saveSetting() {
  const section = settingsSection.value;
  const path = settingsKey.value.trim().split(".");
  if (path.length < 2 || path[0] !== section || path.some((part) => part === "")) {
    throw new Error(`key must name a field of ${section}, such as ${section}.<field>`);
  }
  const value = parseSettingValue(settingsValue.value);
  settingsSave.disabled = true;
  try {
    await saveSection({
      check: (text) => checkSectionText(section, text),
      section,
      path,
      value,
      request,
      run: (name) => bridge.runtime.program.run(name, []),
    });
    settingsStatus.textContent = `saved ${path.join(".")}`;
  } finally {
    settingsSave.disabled = false;
  }
}

settingsSection.replaceChildren(...CHECKED_SECTIONS.map((name) => {
  const option = document.createElement("option");
  option.value = name;
  option.textContent = name;
  return option;
}));
settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  settingsStatus.textContent = "";
  saveSetting().catch((error) => showError("moai settings", error));
});

// The screen buttons show one screen; the SPEC screen is the first one.
for (const button of document.querySelectorAll("nav button[data-screen]")) {
  button.addEventListener("click", () => {
    for (const screen of document.querySelectorAll("section[id^='screen-']")) {
      screen.hidden = screen.id !== button.dataset.screen;
    }
  });
}

async function start() {
  // core.grid is a core status: each change of the tabs reports the value again, and the overview renders it.
  bridge.runtime.status.watch("core.grid", (grid) => {
    lastGrid = grid;
    try {
      renderOverview();
    } catch (error) {
      showError("moai overview", error);
    }
  });
  group()
    .then((moai) => {
      agentNames = moai.agents.map((agent) => agent.name);
      renderOverview();
    })
    .catch((error) => showError("moai overview", error));
  await sidecar.on(surface, (body) => onMessage(body));
  await sidecar.onFailure(surface, (failure) => showError("moai specs", new Error(`files sidecar failed: ${failure}`)));
  seedProject().catch((error) => showError("moai seed", error));
  refresh().catch((error) => showError("moai refresh", error));
}

start().catch((error) => showError("moai specs", error));
