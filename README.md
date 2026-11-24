# moai plugin

[한국어](README.ko.md)

moai plugin: the moai maker group for the `agents` plugin and the moai web surface. The plugin format is defined in the soksak core specification (`docs/spec/plugins.md`).

```sh
make install                                # once after cloning: the locked dependencies
make test                                   # tests of this plugin
make check                                  # document and command checks of the pinned kit release
make pack OUT=<folder>                      # the plugin release
```

## Bundled moai binary

`make pack` writes `plugin/bin/moai`, a `darwin-arm64` moai binary that the build compiles with Go from the moai-adk v3.1.2 source release (`https://codeload.github.com/modu-ai/moai-adk/tar.gz/refs/tags/v3.1.2`, sha256 pinned in `release/upstream.json`) after it applies `release/patches/claude-config-dir.patch`. The patch makes the hooks and the status line of moai keep the Claude Code data of a session in the configuration home that `CLAUDE_CONFIG_DIR` names; the binary is therefore a modified build of moai-adk, and `moai version` shows `patch-<digest>` as its commit. moai-adk is licensed under Apache-2.0: `plugin/bin/moai.LICENSE` is its LICENSE, `plugin/bin/moai.patch` is the change, and the maker folder `plugin/` also carries `plugin/LICENSE`.

The application validates `plugin.json` when it installs the release. The checklist is [docs/features.md](docs/features.md). The source and fork rule is [docs/spec/sources.md](docs/spec/sources.md).
