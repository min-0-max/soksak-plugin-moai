// The packed release keeps the execute bit of the program file plugin/bin/moai, which install requires of a plugin:<path> program
// (core docs/spec/plugins.md#pluginjson).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("the packed release gives plugin/bin/moai an execute bit", { skip: !existsSync("plugin/bin/moai") && "plugin/bin/moai is built by make build" }, () => {
  const out = mkdtempSync(join(tmpdir(), "moai-pack-"));
  try {
    const packed = execFileSync("pnpm", ["--config.verify-deps-before-run=false", "pack", "--pack-destination", out], { encoding: "utf8" }).trim().split("\n").pop();
    const listing = execFileSync("tar", ["-tzvf", packed], { encoding: "utf8" });
    const line = listing.split("\n").find((entry) => entry.endsWith(" package/plugin/bin/moai"));
    assert.ok(line, "the release holds package/plugin/bin/moai");
    assert.match(line, /^-rwx/, `the mode of package/plugin/bin/moai is ${line.slice(0, 10)}`);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
