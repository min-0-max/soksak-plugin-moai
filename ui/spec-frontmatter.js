// Reads the SPEC row of one spec.md with the frontmatter rules of moai-adk internal/spec/lint.go (extractFrontmatter,
// parseSPECDoc): the block between the opening `---` and the first `\n---`, parsed as YAML. The id is the frontmatter id,
// and the folder name when the frontmatter has none. A document that cannot be read keeps its row with the error text.
import { parse } from "./vendor/yaml.js";

const SPEC_PATH = ".moai/specs";

// The read request of the spec.md of one SPEC folder. The id correlates the reply with this request.
export function readSpecRequest(id, folder) {
  return { operation: "read", id, path: `${SPEC_PATH}/${folder}/spec.md` };
}

// The row of one document: {folder, id, title, status, tier, era, updated, error}. Absent fields are empty strings.
export function specRowFromDocument(folder, text) {
  const row = { folder, id: folder, title: "", status: "", tier: "", era: "", updated: "", error: null };
  const location = `${folder}/spec.md`;
  if (!text.startsWith("---")) {
    row.error = `${location}: YAML frontmatter missing or does not start with '---'`;
    return row;
  }
  const rest = text.slice(3);
  const end = rest.indexOf("\n---");
  if (end < 0) {
    row.error = `${location}: could not find closing '---' for frontmatter`;
    return row;
  }
  let fields;
  try {
    fields = parse(rest.slice(0, end)) ?? {};
  } catch (error) {
    row.error = `${location}: YAML parsing error: ${error.message}`;
    return row;
  }
  if (typeof fields !== "object" || Array.isArray(fields)) {
    row.error = `${location}: frontmatter must be a mapping`;
    return row;
  }
  row.id = scalarText(fields.id) || folder;
  row.title = scalarText(fields.title);
  row.status = scalarText(fields.status);
  row.tier = scalarText(fields.tier);
  row.era = scalarText(fields.era);
  row.updated = scalarText(fields.updated);
  return row;
}

// A scalar field as text: strings as they are, numbers and dates as their YAML text, absent as the empty string.
function scalarText(value) {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : String(value);
}
