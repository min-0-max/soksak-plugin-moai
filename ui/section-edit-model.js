// Edits one moai configuration section file. The YAML library keeps the other keys and the comments of the document.
// Writes use the files sidecar `write` operation with `expect`, so a file changed on disk is refused, not overwritten.
import { parseDocument } from "./vendor/yaml.js";

const SECTIONS_DIR = ".moai/config/sections";

export function sectionPath(section) {
  return `${SECTIONS_DIR}/${section}.yaml`;
}

// setSectionValue returns the document text with the value at `path` set. Unparseable text is refused with the section name.
export function setSectionValue(text, path, value) {
  const section = path[0];
  const doc = parseDocument(text);
  if (doc.errors.length > 0) {
    throw new Error(`${section}.yaml: YAML ${doc.errors[0].message}`);
  }
  try {
    doc.setIn(path, value);
  } catch (error) {
    throw new Error(`${section}.yaml: cannot set ${path.join(".")}: ${error.message}`);
  }
  return doc.toString();
}

// sectionWriteRequest writes the whole section text. `expect` is the version that the read reply or the previous write returned,
// and `bom` tells whether the file starts with the byte order mark that its read reply reported.
export function sectionWriteRequest(id, section, text, expect, bom = false) {
  return { operation: "write", id, path: sectionPath(section), text, expect, bom };
}

// sectionWriteReply returns the version of the written bytes and throws the sidecar error text.
export function sectionWriteReply(reply) {
  if (typeof reply.error === "string") {
    throw new Error(reply.error);
  }
  if (typeof reply.version !== "string") {
    throw new Error("write reply has no version");
  }
  return reply.version;
}
