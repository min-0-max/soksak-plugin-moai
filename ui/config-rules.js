// Value rules of the moai configuration that the moai loader enforces through config.Validate.
// Source: moai-adk internal/config/validation.go and pkg/models/config.go at rev 1176c97. Each rule names its source line.
// A rule of the console (internal/web/validate.go) is not in this file. The loader replaces a value of the wrong type with a
// default (internal/config/llm_strict_validate.go:6-10), so this file rejects the wrong type instead of accepting it.
// Each rule returns { field, message }; the field uses the path that moai reports (validation.go Field values).

const DEVELOPMENT_MODES = ["ddd", "tdd"]; // pkg/models/config.go:18-19 ValidDevelopmentModes
const CONVENTIONS = ["auto", "conventional-commits", "angular", "karma"]; // validation.go:183-188 validGitConventionNames
const MERGE_METHODS = ["squash", "merge", "rebase"]; // validation.go:260-264 validMergeMethods
const MODES = ["manual", "personal", "team"]; // validation.go:291-296 git_strategy mode profiles

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

  return errors;
}
