// Strict type check of the llm section file, as moai-adk ValidateLLMYAMLSection does.
// Sources at moai-adk rev 1176c97: the field types of LLMConfig (internal/config/types.go:300-345 and the nested types
// at types.go:375-430), the session types (session_defaults.go:36-55), ModelEffort (internal/config/audit_models.go:65-68),
// the decode rules of strictUnmarshalSection (internal/config/resolver.go:785-827, yaml.v3 non-strict decoding),
// and the !!bool tag of agent_overrides_consume (internal/config/llm_strict_validate.go:71).
// Unknown keys are ignored, as yaml.v3 ignores them without KnownFields. A string field accepts any scalar, as yaml.v3 does.
// Each error is { field, expected, actual }, where field is the dotted key path.
import { isMap, isScalar, isSeq, parseDocument } from "./vendor/yaml.js";

const STRING = { kind: "string" };
const INT = { kind: "int" };
const map = (fields) => ({ kind: "map", fields });
const mapOf = (value) => ({ kind: "map", fields: {}, mapOf: value });

const modelEffort = map({ model: STRING, effort: STRING });
const rolePair = map({ leader: modelEffort, lane: modelEffort });
const LLM = map({
  mode: STRING,
  team_mode: STRING,
  harness: STRING,
  glm_env_var: STRING,
  claude_bin: STRING,
  profile: STRING,
  defaults: map({ sessions: map({ mode: STRING, cc: rolePair, glm: rolePair, codex: rolePair }) }),
  agent_overrides: mapOf(modelEffort),
  // agent_overrides_consume is checked by its own tag rule below, which is stricter than the bool kind
  claude_models: map({ high: STRING, medium: STRING, low: STRING }),
  glm: map({
    base_url: STRING,
    models: map({ high: STRING, medium: STRING, low: STRING, fable: STRING }),
    context_windows: mapOf(INT),
    effort: map({ high: STRING, medium: STRING, low: STRING, fable: STRING }),
  }),
  default_model: STRING,
  quality_model: STRING,
  speed_model: STRING,
});

const INT_SOURCE = /^[-+]?(0|[1-9][0-9_]*)$|^0x[0-9a-fA-F_]+$|^0o[0-7_]+$/;

// kindOf names the YAML kind of a node the way yaml.v3 tags it: str, int, float, bool, null, mapping or sequence.
function kindOf(node) {
  if (isMap(node)) return "mapping";
  if (isSeq(node)) return "sequence";
  if (!isScalar(node) || node.value === null || node.value === undefined) return "null";
  if (String(node.type).startsWith("QUOTE") || String(node.type).startsWith("BLOCK")) return "str";
  if (typeof node.value === "boolean") return "bool";
  if (typeof node.value === "number") return INT_SOURCE.test(String(node.source ?? "")) ? "int" : "float";
  return "str";
}

function check(node, schema, field, errors) {
  if (node === null || node === undefined) return;
  const kind = kindOf(node);
  if (kind === "null") return;
  if (schema.kind === "string") {
    if (!isScalar(node)) errors.push({ field, expected: "string", actual: kind });
    return;
  }
  if (schema.kind === "int") {
    if (kind !== "int") errors.push({ field, expected: "int", actual: kind });
    return;
  }
  // map
  if (!isMap(node)) {
    errors.push({ field, expected: "mapping", actual: kind });
    return;
  }
  for (const pair of node.items) {
    const key = String(pair.key?.value ?? "");
    const child = `${field}.${key}`;
    if (schema.mapOf) check(pair.value, schema.mapOf, child, errors);
    else if (Object.hasOwn(schema.fields, key)) check(pair.value, schema.fields[key], child, errors);
  }
}

// validateLlmSection returns the type errors of the llm section in a YAML document. A document without an llm key has none.
export function validateLlmSection(text) {
  const doc = parseDocument(text);
  if (doc.errors.length > 0) throw new Error(`llm.yaml: YAML ${doc.errors[0].message}`);
  if (!isMap(doc.contents)) return [];
  const pair = doc.contents.items.find((item) => String(item.key?.value) === "llm");
  if (!pair) return [];
  const errors = [];
  check(pair.value, LLM, "llm", errors);
  // validateConsumeKeyBool, llm_strict_validate.go:71: the key must carry the !!bool tag, so a quoted or null value is an error
  if (isMap(pair.value)) {
    const consume = pair.value.items.find((item) => String(item.key?.value) === "agent_overrides_consume");
    if (consume && kindOf(consume.value) !== "bool") {
      errors.push({ field: "llm.agent_overrides_consume", expected: "bool", actual: kindOf(consume.value) });
    }
  }
  return errors;
}
