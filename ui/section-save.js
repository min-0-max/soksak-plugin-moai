// Saves one value of a moai section file and checks it with moai's own load. The flow reads the file, writes the new text with
// `expect` set to the version of the read, and runs the moai load program `config-load` (plugin.json `programs`). A failed load
// writes the previous text back with `expect` set to the version of the write, and reports moai's error text.
import { programStdout } from "./program-reply.js";
import { sectionPath, sectionWriteReply, sectionWriteRequest, setSectionValue } from "./section-edit-model.js";

export const CONFIG_LOAD_PROGRAM = "config-load";

// saveSection resolves with {version} of the saved text. check(text) throws when the new text breaks a rule, and nothing is written then.
// request(makeBody) sends one files sidecar request and resolves with its reply body or rejects with the sidecar error; run(name)
// resolves with the reply of a declared program run.
export async function saveSection({ section, path, value, check, request, run }) {
  const file = sectionPath(section);
  const read = await request((id) => ({ operation: "read", id, path: file }));
  if (typeof read.text !== "string" || typeof read.version !== "string" || typeof read.bom !== "boolean") {
    throw new Error(`${file}: read reply must carry text, version and bom`);
  }
  const next = setSectionValue(read.text, path, value);
  check(next);
  const version = sectionWriteReply(await request((id) => sectionWriteRequest(id, section, next, read.version, read.bom)));
  try {
    programStdout(CONFIG_LOAD_PROGRAM, await run(CONFIG_LOAD_PROGRAM));
  } catch (loadError) {
    try {
      await request((id) => sectionWriteRequest(id, section, read.text, version, read.bom));
    } catch (restoreError) {
      throw new Error(`${loadError.message}; restoring ${file} also failed: ${restoreError.message}`);
    }
    throw new Error(`${loadError.message}; ${file} was restored to its previous text`);
  }
  return { version };
}
