# moai plugin

[English](README.md)

`agents` plugin의 moai 메이커 group과 moai web surface를 제공하는 plugin이에요. Plugin 형식은 soksak core spec(`docs/spec/plugins.md`)이 정해요.

```sh
make install                                # clone 후 한 번: 고정된 dependency 설치
make test                                   # 이 plugin의 test
make check                                  # 고정된 kit release의 document와 command 검사
make pack OUT=<folder>                      # plugin release
```

## 포함된 moai 바이너리

`make pack`은 `plugin/bin/moai`를 쓰며, 이는 moai-adk v3.1.2(`darwin-arm64`)의 moai 바이너리예요. 원본은 `https://github.com/modu-ai/moai-adk/releases/download/v3.1.2/`의 release 파일 `moai-adk_3.1.2_darwin_arm64.tar.gz`예요. Build는 파일을 복사하기 전에 `release/upstream.json`에 고정된 sha256을 검사해요. moai-adk는 Apache-2.0 라이선스예요. `plugin/bin/moai.LICENSE`는 그 release 파일의 LICENSE이고, `plugin/bin/moai.NOTICE`는 그 release 파일의 NOTICE예요. Release 파일에 NOTICE가 없어서 build는 NOTICE를 쓰지 않아요. 메이커 폴더 `plugin/`에는 moai-adk 원본 release의 LICENSE인 `plugin/LICENSE`도 있어요.

Application은 release를 설치할 때 `plugin.json`을 검증해요. Checklist는 [docs/features.md](docs/features.md)예요. Source와 fork 규칙은 [docs/spec/sources.md](docs/spec/sources.md)예요.
