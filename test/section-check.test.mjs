// Checks the rules that a section file must pass before it is written: the value rules of config-rules.js and the llm type check of
// llm-section-rules.js, and the parsing of the value that the settings form sends.
import assert from "node:assert/strict";
import test from "node:test";
import { checkSectionText, parseSettingValue } from "../ui/section-check.js";

test("checkSectionText passes a quality section whose values follow the moai rules", () => {
  assert.doesNotThrow(() => checkSectionText("quality", "quality:\n  development_mode: tdd\n  test_coverage_target: 85\n"));
});

test("checkSectionText names the section file and the field of a value rule error", () => {
  assert.throws(
    () => checkSectionText("quality", "quality:\n  development_mode: waterfall\n"),
    /quality\.yaml: quality\.development_mode/,
  );
});

test("checkSectionText checks the llm section with its type rules", () => {
  assert.throws(
    () => checkSectionText("llm", "llm:\n  agent_overrides_consume: \"true\"\n"),
    /llm\.yaml: llm\.agent_overrides_consume/,
  );
  assert.doesNotThrow(() => checkSectionText("llm", "llm:\n  agent_overrides_consume: true\n"));
});

test("checkSectionText refuses text that is not YAML", () => {
  assert.throws(() => checkSectionText("quality", "quality: [\n"), /YAML/);
});

test("checkSectionText refuses a section name outside the checked sections", () => {
  assert.throws(() => checkSectionText("language", "language:\n  x: 1\n"), /language is not a checked section/);
});

test("parseSettingValue reads a YAML scalar as its typed value", () => {
  assert.equal(parseSettingValue("90"), 90);
  assert.equal(parseSettingValue("tdd"), "tdd");
  assert.equal(parseSettingValue("true"), true);
});

test("parseSettingValue refuses an empty value and a value that is not a scalar", () => {
  assert.throws(() => parseSettingValue(""), /value must not be empty/);
  assert.throws(() => parseSettingValue("[1, 2]"), /value must be a YAML scalar/);
});
