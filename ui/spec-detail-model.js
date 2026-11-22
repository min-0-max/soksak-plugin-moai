// The SPEC detail rows of the moai surface: one row per SPEC folder, with the row of its spec.md (spec-frontmatter.js) and the
// MUST-FIX remediations of its SPEC in the output of `moai spec audit --json` (spec-audit-model.js). A finding for a SPEC without
// a folder gets its own row with an error, so no finding is dropped.
import { mustFixBySpec, parseAuditOutput } from "./spec-audit-model.js";
import { specRowFromDocument } from "./spec-frontmatter.js";

// folders: the SPEC folder names in display order. documents: Map of folder to {text} or {error}, the read result of each spec.md.
// auditText: the stdout of the audit run. Throws with the field that is wrong when a document or the audit text is not valid.
export function specDetailRows(folders, documents, auditText) {
  const audit = parseAuditOutput(auditText);
  const remediations = mustFixBySpec(audit);
  const rows = folders.map((folder) => {
    const document = documents.get(folder);
    if (document === undefined) {
      throw new Error(`${folder}: no document was read`);
    }
    const row = "text" in document
      ? specRowFromDocument(folder, document.text)
      : { folder, id: folder, title: "", status: "", tier: "", era: "", updated: "", error: `${folder}/spec.md: ${document.error}` };
    return { ...row, mustFix: remediations[folder] ?? [] };
  });
  const ids = new Set(folders);
  for (const specId of Object.keys(remediations)) {
    if (ids.has(specId)) continue;
    rows.push({
      folder: specId, id: specId, title: "", status: "", tier: "", era: "", updated: "",
      error: `${specId}: MUST-FIX findings of a SPEC without a folder under .moai/specs`,
      mustFix: remediations[specId],
    });
  }
  return rows;
}
