// Value rules of the moai configuration that the moai loader enforces through config.Validate.
// Source: moai-adk internal/config/validation.go and pkg/models/config.go at rev 1176c97. Each rule names its source line.
// A rule of the console (internal/web/validate.go) is not in this file. The loader replaces a value of the wrong type with a
// default (internal/config/llm_strict_validate.go:6-10), so this file rejects the wrong type instead of accepting it.
// Each rule returns { field, message }; the field uses the path that moai reports (validation.go Field values).

const DEVELOPMENT_MODES = ["ddd", "tdd"]; // pkg/models/config.go:18-19 ValidDevelopmentModes
const CONVENTIONS = ["auto", "conventional-commits", "angular", "karma"]; // validation.go:183-188 validGitConventionNames
const MERGE_METHODS = ["squash", "merge", "rebase"]; // validation.go:260-264 validMergeMethods
const MODES = ["manual", "personal", "team"]; // validation.go:291-296 git_strategy mode profiles
const PROFILES = ["high", "medium", "low", "max"]; // profile.go:28-37 and 58-63: the legacy max is normalized to high, so it is accepted
const OVERRIDE_MODELS = ["opus", "sonnet", "fable", "haiku", "inherit"]; // profile.go:106-112 validOverrideModels
const OVERRIDE_EFFORTS = ["low", "medium", "high", "xhigh", "max"]; // profile.go:117-123 validOverrideEfforts
const RETAINED_AGENTS = [
  "manager-spec", "plan-auditor", "sync-auditor", "manager-develop", "super-advisor", "manager-design", "manager-lead",
  "builder-harness", "e2e-tester", "manager-docs", "manager-git", "manager-todo", "Explore",
]; // profile.go:133-147 retainedAgentNames
// The 41 paths that validation.go:317-383 checks for dynamic tokens. Other string paths are not checked by moai.
const DYNAMIC_TOKEN_FIELDS = [
  "user.name",
  "language.conversation_language", "language.conversation_language_name", "language.agent_prompt_language",
  "language.git_commit_messages", "language.code_comments", "language.documentation", "language.error_messages",
  "quality.development_mode", "quality.ddd_settings.max_transformation_size",
  "system.version", "system.log_level", "system.log_format",
  "git_strategy.branch_prefix", "git_strategy.commit_style",
  "git_strategy.manual.workflow", "git_strategy.manual.environment", "git_strategy.manual.commit_style.format",
  "git_strategy.manual.hooks.pre_commit", "git_strategy.manual.hooks.pre_push", "git_strategy.manual.hooks.commit_msg",
  "git_strategy.personal.workflow", "git_strategy.personal.environment", "git_strategy.personal.branch_prefix",
  "git_strategy.personal.commit_style.format", "git_strategy.personal.hooks.pre_commit",
  "git_strategy.personal.hooks.pre_push", "git_strategy.personal.hooks.commit_msg",
  "git_strategy.team.workflow", "git_strategy.team.environment", "git_strategy.team.branch_prefix",
  "git_strategy.team.commit_style.format", "git_strategy.team.hooks.pre_commit", "git_strategy.team.hooks.pre_push",
  "git_strategy.team.hooks.commit_msg",
  "git_convention.convention", "git_convention.auto_detection.fallback",
  "llm.default_model", "llm.quality_model", "llm.speed_model",
];
// validation.go:20-24 dynamicTokenPatterns: ${VAR}, {{VAR}} and $VAR
const DYNAMIC_TOKEN_PATTERNS = [/\$\{[^}]+\}/, /\{\{[^}]+\}\}/, /\$[A-Z_][A-Z0-9_]*/];

const error = (field, message) => ({ field, message });

const isAbsent = (value) => value === undefined || value === null || value === "";

// numberOf returns an error when a present value is not a number (no upstream line: the Go decoder rejects it, llm_strict_validate.go:6-10).
function numberOf(field, value) {
  if (value === undefined || value === null) return null;
  return typeof value === "number" && Number.isFinite(value) ? null : error(field, "must be a number");
}

// range mirrors validation.go:126-150 validateQualityConfig (0 to 100 inclusive).
function percentage(field, value, errors) {
  const typed = numberOf(field, value);
  if (typed) {
    errors.push(typed);
  } else if (value !== undefined && value !== null && (value < 0 || value > 100)) {
    errors.push(error(field, "must be between 0 and 100"));
  }
}

// validateGLMBaseURL in validation.go:79-105: an absent value is accepted; a set value must be https with a host.
// The message wording is this plugin's; the accepted set is the same as the loader's.
function glmBaseUrl(value) {
  if (isAbsent(value)) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return error("llm.glm.base_url", "malformed URL; expected a well-formed https:// URL with a host");
  }
  if (url.protocol !== "https:") return error("llm.glm.base_url", "scheme must be https");
  if (url.hostname === "") return error("llm.glm.base_url", "URL has no host");
  return null;
}

// dynamicTokenOf returns the first token of a value (validation.go:385-400 checkStringField), or null.
function dynamicTokenOf(value) {
  for (const pattern of DYNAMIC_TOKEN_PATTERNS) {
    const match = value.match(pattern);
    if (match) return match[0];
  }
  return null;
}

const valueAt = (object, path) => path.split(".").reduce((node, key) => node?.[key], object);

// validateSections returns every rule violation of the sections, in the order of validation.go.
// `sections` maps a section name to its parsed object, for example { quality: {...}, git_convention: {...} }.
export function validateSections(sections) {
  const errors = [];
  const quality = sections.quality ?? {};
  const convention = sections.git_convention ?? {};
  const strategy = sections.git_strategy ?? {};
  const llm = sections.llm ?? {};

  // validateDevelopmentMode, validation.go:107-124 and pkg/models/config.go:23-27
  if (!isAbsent(quality.development_mode) && !DEVELOPMENT_MODES.includes(quality.development_mode)) {
    errors.push(error("quality.development_mode", `must be one of: ${DEVELOPMENT_MODES.join(", ")}`));
  }

  // validateQualityConfig, validation.go:126-155
  percentage("quality.test_coverage_target", quality.test_coverage_target, errors);
  percentage("quality.tdd_settings.min_coverage_per_commit", quality.tdd_settings?.min_coverage_per_commit, errors);
  percentage("quality.coverage_exemptions.max_exempt_percentage", quality.coverage_exemptions?.max_exempt_percentage, errors);

  // validateGitConventionConfig, validation.go:215-256
  if (!isAbsent(convention.convention) && !CONVENTIONS.includes(convention.convention)) {
    errors.push(error("git_convention.convention", `must be one of: ${CONVENTIONS.join(", ")}`));
  }
  const detection = convention.auto_detection ?? {};
  const sampleSize = numberOf("git_convention.auto_detection.sample_size", detection.sample_size);
  if (sampleSize) errors.push(sampleSize);
  else if (detection.sample_size !== undefined && detection.sample_size < 0) {
    errors.push(error("git_convention.auto_detection.sample_size", "must be non-negative"));
  }
  const threshold = numberOf("git_convention.auto_detection.confidence_threshold", detection.confidence_threshold);
  if (threshold) errors.push(threshold);
  else if (detection.confidence_threshold !== undefined && (detection.confidence_threshold < 0 || detection.confidence_threshold > 1)) {
    errors.push(error("git_convention.auto_detection.confidence_threshold", "must be between 0.0 and 1.0"));
  }
  const maxLength = numberOf("git_convention.validation.max_length", convention.validation?.max_length);
  if (maxLength) errors.push(maxLength);
  else if (convention.validation?.max_length !== undefined && convention.validation.max_length < 0) {
    errors.push(error("git_convention.validation.max_length", "must be non-negative"));
  }

  // validateGitStrategyMergeMethod, validation.go:291-310
  for (const mode of MODES) {
    const method = strategy[mode]?.merge_method;
    if (!isAbsent(method) && !MERGE_METHODS.includes(method)) {
      errors.push(error(`git_strategy.${mode}.merge_method`, `must be one of: ${MERGE_METHODS.join(", ")}`));
    }
  }

  // validateGLMBaseURL, validation.go:79-105
  const base = glmBaseUrl(llm.glm?.base_url);
  if (base) errors.push(base);

  // NormalizeProfile and IsValidProfile (profile.go:58-71) and validateProfile (profile.go:154-168); the value is trimmed
  const profile = typeof llm.profile === "string" ? llm.profile.trim() : llm.profile;
  if (!isAbsent(profile) && !PROFILES.includes(profile)) {
    errors.push(error("llm.profile", `profile ${profile} is not in the closed set {high, medium, low}`));
  }

  // validateAgentOverrides, profile.go:171-201 (the map is read in its key order)
  for (const [agent, override] of Object.entries(llm.agent_overrides ?? {})) {
    if (!RETAINED_AGENTS.includes(agent)) {
      errors.push(error(`llm.agent_overrides.${agent}`, `agent ${agent} is not in the retained agent catalog`));
      continue;
    }
    const model = typeof override?.model === "string" ? override.model.trim() : "";
    if (model !== "" && !OVERRIDE_MODELS.includes(model)) {
      errors.push(error(`llm.agent_overrides.${agent}.model`, `model ${model} is not in the valid set {${OVERRIDE_MODELS.join(", ")}}`));
    }
    const effort = typeof override?.effort === "string" ? override.effort.trim() : "";
    if (effort !== "" && !OVERRIDE_EFFORTS.includes(effort)) {
      errors.push(error(`llm.agent_overrides.${agent}.effort`, `effort ${effort} is not in the valid set {${OVERRIDE_EFFORTS.join(", ")}}`));
    }
  }

  // validateDynamicTokens, validation.go:317-383 over the 41 fields; a present non-string value is a type error
  for (const field of DYNAMIC_TOKEN_FIELDS) {
    const value = valueAt(sections, field);
    if (value === undefined || value === null || value === "") continue;
    if (typeof value !== "string") {
      errors.push(error(field, "must be a string"));
      continue;
    }
    const token = dynamicTokenOf(value);
    if (token) errors.push(error(field, `contains unexpanded dynamic token: ${token}`));
  }

  return errors;
}
