// Checks the SPEC row of one spec.md with literal documents, using the frontmatter rules of internal/spec/lint.go (extractFrontmatter, parseSPECDoc).
import assert from "node:assert/strict";
import test from "node:test";
import { readSpecRequest, specRowFromDocument } from "../ui/spec-frontmatter.js";

const DOC = `---
id: SPEC-WEB-001
title: The SPEC board
status: in-progress
tier: M
era: V3R6
updated: 2026-11-20
---

# Body
`;

test("readSpecRequest names the spec.md of the SPEC folder relative to the project root", () => {
  assert.deepEqual(readSpecRequest("req-1", "SPEC-WEB-001"), { operation: "read", id: "req-1", path: ".moai/specs/SPEC-WEB-001/spec.md" });
});

test("specRowFromDocument returns the id, title, status, tier, era and updated of the frontmatter", () => {
  assert.deepEqual(specRowFromDocument("SPEC-WEB-001", DOC), {
    folder: "SPEC-WEB-001",
    id: "SPEC-WEB-001",
    title: "The SPEC board",
    status: "in-progress",
    tier: "M",
    era: "V3R6",
    updated: "2026-11-20",
    error: null,
  });
});

test("specRowFromDocument takes the folder name as the id and leaves absent fields empty", () => {
  const row = specRowFromDocument("SPEC-TODO-002", "---\ntitle: Queue\nstatus: draft\n---\n");
  assert.equal(row.id, "SPEC-TODO-002");
  assert.equal(row.tier, "");
  assert.equal(row.era, "");
  assert.equal(row.updated, "");
  assert.equal(row.error, null);
});

test("specRowFromDocument reports a document without an opening frontmatter line, and keeps the row", () => {
  const row = specRowFromDocument("SPEC-OLD-003", "# No frontmatter\n");
  assert.equal(row.id, "SPEC-OLD-003");
  assert.equal(row.status, "");
  assert.equal(row.error, "SPEC-OLD-003/spec.md: YAML frontmatter missing or does not start with '---'");
});

test("specRowFromDocument reports a frontmatter that is not YAML, and names the folder", () => {
  const row = specRowFromDocument("SPEC-BAD-004", "---\nid: [unclosed\n---\n");
  assert.match(row.error, /^SPEC-BAD-004\/spec\.md: YAML parsing error:/);
});
