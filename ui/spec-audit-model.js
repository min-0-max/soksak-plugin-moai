// Reads the output of `moai spec audit --json` (moai-adk internal/spec/audit.go, AuditResult). The command is a
// deterministic scan of .moai/specs with no LLM; its drift findings are the MUST-FIX badges of the moai web console.
const SEVERITIES = ["MUST-FIX", "INFO"];

// Parses the output text into {totalSpecs, driftFindings}. Text that is not JSON, or a document that does not match
// the AuditResult shape, throws an error that names the field.
export function parseAuditOutput(text) {
  let document;
  try {
    document = JSON.parse(text);
  } catch (error) {
    throw new Error(`moai spec audit output is not JSON: ${error.message}`);
  }
  if (typeof document !== "object" || document === null || Array.isArray(document)) {
    throw new Error("moai spec audit output must be an object");
  }
  if (!Number.isInteger(document.total_specs)) {
    throw new Error("moai spec audit output field total_specs must be an integer");
  }
  if (!Array.isArray(document.drift_findings)) {
    throw new Error("moai spec audit output field drift_findings must be an array");
  }
  const driftFindings = document.drift_findings.map((finding, i) => {
    const field = `drift_findings[${i}]`;
    if (typeof finding !== "object" || finding === null) {
      throw new Error(`${field} must be an object`);
    }
    if (typeof finding.spec_id !== "string" || finding.spec_id === "") {
      throw new Error(`${field}.spec_id must be a non-empty string`);
    }
    if (typeof finding.finding_type !== "string") {
      throw new Error(`${field}.finding_type must be a string`);
    }
    if (!SEVERITIES.includes(finding.severity)) {
      throw new Error(`${field}.severity must be one of ${SEVERITIES.join(", ")}`);
    }
    if (finding.remediation !== undefined && typeof finding.remediation !== "string") {
      throw new Error(`${field}.remediation must be a string when present`);
    }
    return {
      specId: finding.spec_id,
      era: typeof finding.era === "string" ? finding.era : "",
      findingType: finding.finding_type,
      severity: finding.severity,
      remediation: finding.remediation ?? "",
    };
  });
  return { totalSpecs: document.total_specs, driftFindings };
}

// The MUST-FIX remediations of the audit, grouped by SPEC id in output order. A SPEC without MUST-FIX findings has no key.
export function mustFixBySpec(audit) {
  const grouped = {};
  for (const finding of audit.driftFindings) {
    if (finding.severity !== "MUST-FIX") continue;
    (grouped[finding.specId] ??= []).push(finding.remediation);
  }
  return grouped;
}
