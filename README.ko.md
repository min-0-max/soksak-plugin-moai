# moai plugin

[English](README.md)

`agents` plugin의 moai 메이커 group과 moai web surface를 제공하는 plugin이에요. Plugin 형식은 soksak core spec(`docs/spec/plugins.md`)이 정해요.

```sh
make install                                # clone 후 한 번: 고정된 dependency 설치
make test                                   # 이 plugin의 test
make check                                  # 고정된 kit release의 document와 command 검사
make pack OUT=<folder>                      # plugin release
```

Application은 release를 설치할 때 `plugin.json`을 검증해요. Checklist는 [docs/features.md](docs/features.md)예요. Source와 fork 규칙은 [docs/spec/sources.md](docs/spec/sources.md)예요.
