// The checks that a section file must pass before the settings screen writes it: the value rules of config-rules.js (validation.go
// and pkg/models/config.go) for quality, git_convention and git_strategy, and the llm type check of llm-section-rules.js.
// parseSettingValue reads the value that the form sends as one YAML scalar, so `90` is a number and `tdd` is a text.
import { parseDocument } from "./vendor/yaml.js";
import { validateSections } from "./config-rules.js";
import { validateLlmSection } from "./llm-section-rules.js";

export const CHECKED_SECTIONS = ["quality", "git_convention", "git_strategy", "llm"];

// checkSectionText throws an error that names the section file and each rule that the text breaks. Text that is not YAML throws too.
export function checkSectionText(section, text) {
  if (!CHECKED_SECTIONS.includes(section)) {
    throw new Error(`${section} is not a checked section`);
  }
  if (section === "llm") {
    const errors = validateLlmSection(text).map((error) => `${error.field} must be ${error.expected}, found ${error.actual}`);
    if (errors.length > 0) throw new Error(`llm.yaml: ${errors.join("; ")}`);
    return;
  }
  const doc = parseDocument(text);
  if (doc.errors.length > 0) throw new Error(`${section}.yaml: YAML ${doc.errors[0].message}`);
  const root = doc.toJS() ?? {};
  const errors = validateSections({ [section]: root[section] ?? {} }).map((error) => `${error.field} ${error.message}`);
  if (errors.length > 0) throw new Error(`${section}.yaml: ${errors.join("; ")}`);
}

// parseSettingValue returns the typed value of one YAML scalar. An empty text and a text that is a mapping or a sequence are refused.
export function parseSettingValue(text) {
  if (text.trim() === "") throw new Error("value must not be empty");
  const doc = parseDocument(text);
  if (doc.errors.length > 0) throw new Error(`value is not YAML: ${doc.errors[0].message}`);
  const value = doc.toJS();
  if (typeof value === "object" && value !== null) throw new Error("value must be a YAML scalar");
  return value;
}
