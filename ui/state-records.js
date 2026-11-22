// The records of the moai state folders: .moai/state/todo/<session>.json, .moai/state/goal/<session>.json and the files of
// .moai/state/verify. The record schema is not in any contract, so a record keeps its JSON value as it is parsed, and a text that is
// not JSON keeps its row with its error, which the page shows through its error path.
export const STATE_FOLDERS = { todo: ".moai/state/todo", goal: ".moai/state/goal", verify: ".moai/state/verify" };

// recordRows returns {name, value, error} for each {name, text, readError} of a folder listing, in the order given. A file whose read
// failed carries readError and no text; its row keeps the read error.
export function recordRows(files) {
  return files.map(({ name, text, readError }) => {
    if (readError !== undefined) return { name, value: null, error: `${name}: ${readError}` };
    try {
      return { name, value: JSON.parse(text), error: null };
    } catch (error) {
      return { name, value: null, error: `${name}: not JSON: ${error.message}` };
    }
  });
}
