// Bundles each vendored library into one file under ui/vendor/, with the notice of the library beside it.
// --check builds the bundles again and fails when a committed file differs from a new build.
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { build } from "esbuild";

// entry: the module in vendor/ that re-exports the library; output: the bundle the page imports; name: the installed package.
const LIBRARIES = [
  { entry: "vendor/yaml.js", output: "ui/vendor/yaml.js", notices: "ui/vendor/yaml.LICENSE.txt", name: "yaml" },
  { entry: "vendor/go-template.js", output: "ui/vendor/go-template.js", notices: "ui/vendor/go-template.LICENSE.txt", name: "@promptctl/go-template-js" },
];

const root = new URL("../", import.meta.url);
const check = process.argv.includes("--check");
let stale = false;

for (const library of LIBRARIES) {
  const packageDir = dirname(realpathSync(new URL(`node_modules/${library.name}/package.json`, root)));
  const pkg = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
  const license = readFileSync(join(packageDir, "LICENSE"), "utf8").trim();
  const notices = `# ${library.name} ${pkg.version} (${pkg.license})\n\n${license}\n`;
  const result = await build({
    entryPoints: [new URL(library.entry, root).pathname],
    bundle: true,
    format: "esm",
    target: "safari17",
    legalComments: "eof",
    write: false,
    logLevel: "silent",
  });
  const bundled = result.outputFiles[0].text;
  const outputUrl = new URL(library.output, root);
  const noticesUrl = new URL(library.notices, root);
  if (check) {
    for (const [file, text] of [[outputUrl, bundled], [noticesUrl, notices]]) {
      if (readFileSync(file, "utf8") !== text) {
        console.error(`${file.pathname} differs from a new build; run pnpm build`);
        stale = true;
      }
    }
  } else {
    writeFileSync(outputUrl, bundled);
    writeFileSync(noticesUrl, notices);
  }
}
if (stale) process.exit(1);
