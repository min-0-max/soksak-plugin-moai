# moai plugin

[한국어](README.ko.md)

moai plugin: the moai maker group for the `agents` plugin and the moai web surface. The plugin format is defined in the soksak core specification (`docs/spec/plugins.md`).

```sh
make install                                # once after cloning: the locked dependencies
make test                                   # tests of this plugin
make check                                  # document and command checks of the pinned kit release
make pack OUT=<folder>                      # the plugin release
```

The application validates `plugin.json` when it installs the release. The checklist is [docs/features.md](docs/features.md).
