// Bundles the YAML library into the one file ui/vendor/yaml.js, which the SPEC reader imports.
// --check builds the bundle again and fails when it differs from the committed files.
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { build } from "esbuild";

const OUTPUT = new URL("../ui/vendor/yaml.js", import.meta.url);
const NOTICES = new URL("../ui/vendor/yaml.LICENSE.txt", import.meta.url);
/* The license of the bundled package, which the release ships beside the bundle. */
const yaml = dirname(realpathSync(new URL("../node_modules/yaml/package.json", import.meta.url)));
const notices = `# yaml 2.9.1 (ISC)\n\n${readFileSync(join(yaml, "LICENSE"), "utf8").trim()}\n`;
const result = await build({
  entryPoints: [new URL("../vendor/yaml.js", import.meta.url).pathname],
  bundle: true,
  format: "esm",
  target: "safari17",
  legalComments: "eof",
  write: false,
  logLevel: "silent",
});
const bundled = result.outputFiles[0].text;
if (process.argv.includes("--check")) {
  for (const [file, text] of [[OUTPUT, bundled], [NOTICES, notices]]) {
    if (readFileSync(file, "utf8") !== text) {
      console.error(`${file.pathname} differs from a new build; run pnpm build`);
      process.exit(1);
    }
  }
} else {
  writeFileSync(OUTPUT, bundled);
  writeFileSync(NOTICES, notices);
}
