// Checks the value rules of the moai configuration that the moai loader enforces through config.Validate
// (moai-adk internal/config/validation.go, rev 1176c97). Each rule names its upstream source in config-rules.js.
import assert from "node:assert/strict";
import test from "node:test";
import { validateSections } from "../ui/config-rules.js";

const valid = () => ({
  quality: { development_mode: "tdd", test_coverage_target: 85, tdd_settings: { min_coverage_per_commit: 80 }, coverage_exemptions: { max_exempt_percentage: 10 } },
  git_convention: { convention: "auto", auto_detection: { sample_size: 100, confidence_threshold: 0.8 }, validation: { max_length: 72 } },
  git_strategy: { manual: { merge_method: "squash" }, personal: { merge_method: "merge" }, team: { merge_method: "rebase" } },
  llm: { glm: { base_url: "https://api.z.ai/api/anthropic" } },
});

const fieldsOf = (sections) => validateSections(sections).map((error) => error.field);

test("a valid configuration has no errors", () => {
  assert.deepEqual(validateSections(valid()), []);
});

test("absent and empty optional values are not errors, as in validateDevelopmentMode and validateGitStrategyMergeMethod", () => {
  assert.deepEqual(validateSections({ quality: {}, git_convention: {}, git_strategy: {}, llm: {} }), []);
  assert.deepEqual(validateSections({ quality: { development_mode: "" }, git_strategy: { team: { merge_method: "" } } }), []);
});

test("quality.development_mode accepts only ddd and tdd", () => {
  const sections = valid();
  sections.quality.development_mode = "waterfall";
  assert.deepEqual(validateSections(sections), [
    { field: "quality.development_mode", message: "must be one of: ddd, tdd" },
  ]);
});

test("the three quality percentages must be between 0 and 100", () => {
  for (const [path, value] of [
    [["quality", "test_coverage_target"], 101],
    [["quality", "tdd_settings", "min_coverage_per_commit"], -1],
    [["quality", "coverage_exemptions", "max_exempt_percentage"], 150],
  ]) {
    const sections = valid();
    let target = sections;
    for (const key of path.slice(0, -1)) target = target[key];
    target[path.at(-1)] = value;
    assert.deepEqual(fieldsOf(sections), [path.join(".")]);
  }
});

test("git_convention.convention accepts the four convention names", () => {
  for (const name of ["auto", "conventional-commits", "angular", "karma"]) {
    const sections = valid();
    sections.git_convention.convention = name;
    assert.deepEqual(validateSections(sections), [], name);
  }
  const sections = valid();
  sections.git_convention.convention = "gitmoji";
  assert.deepEqual(fieldsOf(sections), ["git_convention.convention"]);
});

test("git_convention numeric bounds: sample_size and max_length >= 0, confidence_threshold in 0..1", () => {
  const sections = valid();
  sections.git_convention.auto_detection.sample_size = -1;
  sections.git_convention.auto_detection.confidence_threshold = 1.5;
  sections.git_convention.validation.max_length = -2;
  assert.deepEqual(fieldsOf(sections), [
    "git_convention.auto_detection.sample_size",
    "git_convention.auto_detection.confidence_threshold",
    "git_convention.validation.max_length",
  ]);
});

test("git_strategy merge_method of each mode accepts squash, merge and rebase only", () => {
  const sections = valid();
  sections.git_strategy.personal.merge_method = "fast-forward";
  assert.deepEqual(validateSections(sections), [
    { field: "git_strategy.personal.merge_method", message: "must be one of: squash, merge, rebase" },
  ]);
});

test("llm.glm.base_url must be an https URL with a host when set", () => {
  for (const base_url of ["http://api.example.com", "https://", "not a url", "ftp://example.com"]) {
    const sections = valid();
    sections.llm.glm.base_url = base_url;
    assert.deepEqual(fieldsOf(sections), ["llm.glm.base_url"], base_url);
  }
});

test("a value of the wrong type is an error that names the field, not a silent default", () => {
  const sections = valid();
  sections.quality.test_coverage_target = "85";
  assert.deepEqual(validateSections(sections), [
    { field: "quality.test_coverage_target", message: "must be a number" },
  ]);
});

test("llm.profile accepts high, medium, low and the legacy max, which means high", () => {
  for (const profile of ["high", "medium", "low", "max", " low "]) {
    assert.deepEqual(validateSections({ llm: { profile } }), [], profile);
  }
  assert.deepEqual(validateSections({ llm: { profile: "ultra" } }), [
    { field: "llm.profile", message: "profile ultra is not in the closed set {high, medium, low}" },
  ]);
});

test("llm.agent_overrides names only retained agents, and their model and effort values from the closed sets", () => {
  assert.deepEqual(
    validateSections({ llm: { agent_overrides: { "manager-spec": { model: "sonnet", effort: "xhigh" }, "Explore": {} } } }),
    [],
  );
  assert.deepEqual(validateSections({ llm: { agent_overrides: { "manager-unknown": {} } } }), [
    { field: "llm.agent_overrides.manager-unknown", message: "agent manager-unknown is not in the retained agent catalog" },
  ]);
  assert.deepEqual(validateSections({ llm: { agent_overrides: { "manager-spec": { model: "gpt" } } } }), [
    { field: "llm.agent_overrides.manager-spec.model", message: "model gpt is not in the valid set {opus, sonnet, fable, haiku, inherit}" },
  ]);
  assert.deepEqual(validateSections({ llm: { agent_overrides: { "manager-spec": { effort: "ultra" } } } }), [
    { field: "llm.agent_overrides.manager-spec.effort", message: "effort ultra is not in the valid set {low, medium, high, xhigh, max}" },
  ]);
});

test("a string value with an unexpanded dynamic token is an error, for each token form", () => {
  for (const value of ["${HOME}/x", "{{name}}", "$PATH"]) {
    assert.deepEqual(validateSections({ user: { name: value } }), [
      { field: "user.name", message: `contains unexpanded dynamic token: ${value.match(/\$\{[^}]+\}|\{\{[^}]+\}\}|\$[A-Z_][A-Z0-9_]*/)[0]}` },
    ], value);
  }
  assert.deepEqual(validateSections({ user: { name: "Min" }, git_strategy: { team: { hooks: { pre_push: "make $CHECK" } } } }), [
    { field: "git_strategy.team.hooks.pre_push", message: "contains unexpanded dynamic token: $CHECK" },
  ]);
});

test("a dynamic token in a path that moai does not check is not an error", () => {
  assert.deepEqual(validateSections({ user: { email: "$NOT_CHECKED" } }), []);
});
