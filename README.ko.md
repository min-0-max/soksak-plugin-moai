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

`make pack`은 `plugin/bin/moai`를 써요. 이 파일은 `darwin-arm64` moai 바이너리예요. Build가 moai-adk v3.1.2 원본 release(`https://codeload.github.com/modu-ai/moai-adk/tar.gz/refs/tags/v3.1.2`, sha256은 `release/upstream.json`에 고정)에 `release/patches/claude-config-dir.patch`를 적용한 뒤 Go로 compile해요. 이 patch는 moai의 hook과 status line이 세션의 Claude Code 데이터를 `CLAUDE_CONFIG_DIR`이 가리키는 설정 home에 두게 해요. 그래서 이 바이너리는 moai-adk를 수정한 build이고, `moai version`은 commit으로 `patch-<digest>`를 보여줘요. moai-adk는 Apache-2.0 라이선스예요. `plugin/bin/moai.LICENSE`가 그 LICENSE이고, `plugin/bin/moai.patch`가 수정 내용이며, 메이커 폴더 `plugin/`에는 `plugin/LICENSE`도 있어요.

Application은 release를 설치할 때 `plugin.json`을 검증해요. Checklist는 [docs/features.md](docs/features.md)예요. Source와 fork 규칙은 [docs/spec/sources.md](docs/spec/sources.md)예요.
