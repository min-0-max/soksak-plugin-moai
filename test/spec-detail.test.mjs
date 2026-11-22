// Checks the SPEC detail rows: each folder's spec.md row (core frontmatter rules) with the MUST-FIX remediations of its SPEC from the
// output of `moai spec audit --json`. A row that cannot be read keeps its error, and a finding for a SPEC without a folder is not dropped.
import assert from "node:assert/strict";
import test from "node:test";
import { specDetailRows } from "../ui/spec-detail-model.js";

const SPEC_DOC = "---\nid: SPEC-TODO-001\ntitle: Todo list\nstatus: draft\ntier: 2\nera: v3\nupdated: 2026-11-01\n---\n# body\n";

const AUDIT = JSON.stringify({
  total_specs: 2,
  drift_findings: [
    { spec_id: "SPEC-TODO-001", era: "v3", finding_type: "missing-section", severity: "MUST-FIX", remediation: "Add the Acceptance section." },
    { spec_id: "SPEC-TODO-001", era: "v3", finding_type: "stale-date", severity: "INFO", remediation: "Refresh the date." },
    { spec_id: "SPEC-OLD-002", era: "v2", finding_type: "missing-section", severity: "MUST-FIX", remediation: "Restore the spec file." },
  ],
});

test("specDetailRows returns one row per folder in folder order, with its frontmatter and its MUST-FIX remediations", () => {
  const documents = new Map([["SPEC-TODO-001", { text: SPEC_DOC }]]);
  const rows = specDetailRows(["SPEC-TODO-001"], documents, AUDIT);
  assert.equal(rows.length, 2, "the audit finding of SPEC-OLD-002 has its own row");
  assert.deepEqual(rows[0], {
    folder: "SPEC-TODO-001", id: "SPEC-TODO-001", title: "Todo list", status: "draft", tier: "2", era: "v3", updated: "2026-11-01",
    error: null, mustFix: ["Add the Acceptance section."],
  });
});

test("specDetailRows keeps the row of a folder whose spec.md could not be read, with its error", () => {
  const documents = new Map([["SPEC-TODO-001", { error: "root/.moai/specs/SPEC-TODO-001/spec.md: no such file" }]]);
  const [row] = specDetailRows(["SPEC-TODO-001"], documents, AUDIT);
  assert.equal(row.folder, "SPEC-TODO-001");
  assert.equal(row.error, "SPEC-TODO-001/spec.md: root/.moai/specs/SPEC-TODO-001/spec.md: no such file");
  assert.deepEqual(row.mustFix, ["Add the Acceptance section."]);
});

test("specDetailRows gives a finding of a SPEC without a folder its own row with an error, and drops nothing", () => {
  const documents = new Map([["SPEC-TODO-001", { text: SPEC_DOC }]]);
  const rows = specDetailRows(["SPEC-TODO-001"], documents, AUDIT);
  assert.deepEqual(rows[1], {
    folder: "SPEC-OLD-002", id: "SPEC-OLD-002", title: "", status: "", tier: "", era: "", updated: "",
    error: "SPEC-OLD-002: MUST-FIX findings of a SPEC without a folder under .moai/specs",
    mustFix: ["Restore the spec file."],
  });
});

test("specDetailRows refuses an audit text that is not JSON, with the audit named", () => {
  assert.throws(() => specDetailRows([], new Map(), "moai: command failed"), /moai spec audit output is not JSON/);
});

test("specDetailRows refuses a folder with no document entry", () => {
  assert.throws(() => specDetailRows(["SPEC-TODO-001"], new Map(), AUDIT), /SPEC-TODO-001: no document was read/);
});
