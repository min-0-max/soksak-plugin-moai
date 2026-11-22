# Changelog

[한국어](CHANGELOG.ko.md)

- M3: The manifest declares the top-level `mark` (`moai`) and `icon`, and the `surface` composition: a `view` of the page `ui/web.html` with the document region `moai-web` (`input` `native`). The page holds the element of the region and no script. The field list of the manifest test gained `mark`, `icon` and `surface`, because the surface adds those fields. The surface tests fail on the missing surface, then pass with the 10 tests of the plugin.
- M1: The manifest declares `dependencies` on `agents` at `^0.0.1` and one contribution to `agents.makers` with the module `ui/makers/moai.js`, which M5 writes. The ranges are placeholders until the `agents` release declares the point. The manifest tests fail on the missing manifest, then pass 5 of 5.
- M1: The repository skeleton: `package.json` with `engines.soksak` `^0.0.41` and the kit release for the document and command checks, `Makefile` with the install, test, check and pack targets, the lockfile, the license, the README files and the checklist.
