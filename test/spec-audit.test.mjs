// Checks the reading of the output of `moai spec audit --json` with literal output of the moai-adk source (internal/spec/audit.go, AuditResult).
import assert from "node:assert/strict";
import test from "node:test";
import { mustFixBySpec, parseAuditOutput } from "../ui/spec-audit-model.js";

const OUTPUT = JSON.stringify({
  audited_at: "2026-11-22T00:00:00Z",
  total_specs: 3,
  grandfathered: 1,
  modern_era_clean: 1,
  drift_findings: [
    { spec_id: "SPEC-WEB-001", era: "V3R6", finding_type: "SyncStatusDrift", severity: "MUST-FIX", remediation: "status completed, but the progress file is missing" },
    { spec_id: "SPEC-TODO-002", era: "V3R6", finding_type: "EraAutoDetected", severity: "INFO", remediation: "era inferred from the folder" },
    { spec_id: "SPEC-WEB-001", era: "V3R6", finding_type: "AuditError", severity: "MUST-FIX", remediation: "progress.md cannot be read" },
  ],
});

test("parseAuditOutput reads the counts and the drift findings of the AuditResult object", () => {
  const audit = parseAuditOutput(OUTPUT);
  assert.equal(audit.totalSpecs, 3);
  assert.equal(audit.driftFindings.length, 3);
  assert.deepEqual(audit.driftFindings[1], {
    specId: "SPEC-TODO-002",
    era: "V3R6",
    findingType: "EraAutoDetected",
    severity: "INFO",
    remediation: "era inferred from the folder",
  });
});

test("mustFixBySpec groups the MUST-FIX remediations by SPEC in output order and drops the INFO findings", () => {
  assert.deepEqual(mustFixBySpec(parseAuditOutput(OUTPUT)), {
    "SPEC-WEB-001": ["status completed, but the progress file is missing", "progress.md cannot be read"],
  });
});

test("parseAuditOutput refuses text that is not JSON and names the command", () => {
  assert.throws(() => parseAuditOutput("moai: unknown flag"), /moai spec audit output is not JSON/);
});

test("parseAuditOutput refuses a finding with another severity and names its index and field", () => {
  const bad = JSON.stringify({ total_specs: 1, drift_findings: [{ spec_id: "SPEC-A-001", era: "V3R6", finding_type: "X", severity: "WARN" }] });
  assert.throws(() => parseAuditOutput(bad), /drift_findings\[0\]\.severity/);
});

test("parseAuditOutput refuses an output without drift_findings", () => {
  assert.throws(() => parseAuditOutput(JSON.stringify({ total_specs: 0 })), /drift_findings/);
});
