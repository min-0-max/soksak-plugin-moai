// Checks the strict type of the llm section file, as moai-adk ValidateLLMYAMLSection does (internal/config/llm_strict_validate.go,
// strictUnmarshalSection in resolver.go:785 and the !!bool tag rule in validateConsumeKeyBool, llm_strict_validate.go:68).
import assert from "node:assert/strict";
import test from "node:test";
import { validateLlmSection } from "../ui/llm-section-rules.js";

test("a well-typed llm section has no errors, and unknown keys are ignored", () => {
  const text = [
    "llm:",
    "  profile: high",
    "  claude_bin: /usr/local/bin/claude",
    "  agent_overrides_consume: true",
    "  claude_models: {high: opus, medium: sonnet, low: haiku}",
    "  agent_overrides:",
    "    manager-spec: {model: opus, effort: xhigh}",
    "  glm:",
    "    base_url: https://api.z.ai/api/anthropic",
    "    context_windows: {opus: 200000}",
    "    unknown_key: whatever",
    "  defaults:",
    "    sessions:",
    "      cc:",
    "        leader: {model: opus, effort: high}",
    "",
  ].join("\n");
  assert.deepEqual(validateLlmSection(text), []);
});

test("an absent llm section and empty values are not errors", () => {
  assert.deepEqual(validateLlmSection(""), []);
  assert.deepEqual(validateLlmSection("other:\n  x: [1]\n"), []);
  assert.deepEqual(validateLlmSection("llm:\n  profile:\n  glm:\n"), []);
});

test("a string field given a sequence or a mapping is an error that names the key", () => {
  assert.deepEqual(validateLlmSection("llm:\n  profile: [high]\n"), [
    { field: "llm.profile", expected: "string", actual: "sequence" },
  ]);
  assert.deepEqual(validateLlmSection("llm:\n  default_model: {a: 1}\n"), [
    { field: "llm.default_model", expected: "string", actual: "mapping" },
  ]);
});

test("a map field given a scalar is an error", () => {
  assert.deepEqual(validateLlmSection("llm:\n  claude_models: opus\n"), [
    { field: "llm.claude_models", expected: "mapping", actual: "str" },
  ]);
});

test("an int field needs a plain integer, and a quoted number is a string", () => {
  assert.deepEqual(validateLlmSection("llm:\n  glm:\n    context_windows: {opus: 200000}\n"), []);
  assert.deepEqual(validateLlmSection('llm:\n  glm:\n    context_windows: {opus: "200000"}\n'), [
    { field: "llm.glm.context_windows.opus", expected: "int", actual: "str" },
  ]);
  assert.deepEqual(validateLlmSection("llm:\n  glm:\n    context_windows: {opus: 2.5}\n"), [
    { field: "llm.glm.context_windows.opus", expected: "int", actual: "float" },
  ]);
});

test("agent_overrides_consume must carry the !!bool tag, so a quoted true is an error", () => {
  assert.deepEqual(validateLlmSection('llm:\n  agent_overrides_consume: "true"\n'), [
    { field: "llm.agent_overrides_consume", expected: "bool", actual: "str" },
  ]);
  assert.deepEqual(validateLlmSection("llm:\n  agent_overrides_consume: false\n"), []);
});

test("nested session and override fields are checked with their full key path", () => {
  const text = "llm:\n  agent_overrides:\n    manager-spec:\n      model: [opus]\n  defaults:\n    sessions:\n      codex:\n        lane:\n          effort: [high]\n";
  assert.deepEqual(validateLlmSection(text), [
    { field: "llm.agent_overrides.manager-spec.model", expected: "string", actual: "sequence" },
    { field: "llm.defaults.sessions.codex.lane.effort", expected: "string", actual: "sequence" },
  ]);
});
