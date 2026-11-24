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

`make pack` writes `plugin/bin/moai`, the moai binary of moai-adk v3.1.2 (`darwin-arm64`), from the release file `moai-adk_3.1.2_darwin_arm64.tar.gz` at `https://github.com/modu-ai/moai-adk/releases/download/v3.1.2/`. The build checks the sha256 pinned in `release/upstream.json` before it copies the file. moai-adk is licensed under Apache-2.0: `plugin/bin/moai.LICENSE` is the LICENSE of that release file, and `plugin/bin/moai.NOTICE` is its NOTICE, which the release file does not hold, so the build writes none. The maker folder `plugin/` also carries `plugin/LICENSE`, the LICENSE of the moai-adk source release.

The application validates `plugin.json` when it installs the release. The checklist is [docs/features.md](docs/features.md). The source and fork rule is [docs/spec/sources.md](docs/spec/sources.md).
