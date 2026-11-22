// Reads the reply of a program run, {code, stdout, stderr, truncated} (core docs/spec/native-surfaces.md#program-runs).
// A run that exits with a non-zero code or ends by a signal fails with its stderr text, so the caller shows moai's error.
export function programStdout(name, reply) {
  if (typeof reply !== "object" || reply === null) {
    throw new Error(`program ${name}: reply must be an object`);
  }
  if (typeof reply.stdout !== "string" || typeof reply.stderr !== "string") {
    throw new Error(`program ${name}: reply stdout and stderr must be texts`);
  }
  if (reply.truncated?.stdout === true) {
    throw new Error(`program ${name}: stdout was truncated, so its output is incomplete`);
  }
  if (reply.code === null) {
    throw new Error(`program ${name} ended by a signal: ${reply.stderr.trim()}`.trimEnd());
  }
  if (!Number.isInteger(reply.code)) {
    throw new Error(`program ${name}: reply code must be an integer or null`);
  }
  if (reply.code !== 0) {
    throw new Error(`program ${name} exited with code ${reply.code}: ${reply.stderr.trim()}`.trimEnd());
  }
  return reply.stdout;
}
