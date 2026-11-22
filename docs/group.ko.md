# moai group

[English](group.md)

moai group은 이 plugin이 agents plugin의 extension point `agents.makers`에 기여하는 메이커 group이에요([메이커 group](https://github.com/min-0-max/soksak-plugin-agents/blob/main/docs/spec/makers.md)).

## 배포된 index

이 plugin의 release build는 `ui` 폴더 옆에 `maker/index.json`을 써요. 이 파일은 고정된 revision의 upstream moai 원본을 가져와 교정한 copy의 agent와 스킬을 담아요.

- `agents`: agent마다 `name`, `path`(`agents/` 아래의 상대 경로이며 `.md`로 끝나요. 예: `agents/moai/manager-spec.md`), `cli`(`claude`)를 가지고, 정의에 `model:` 줄이 있으면 `model`도 가져요. Build는 그 값을 index로 옮기고 복사한 정의에서는 줄을 지워요. `model:`이 세션 모델을 덮어쓰기 때문이에요(club.md, 측정 C4). Agents가 그 값을 세션에 적용해요(makers.md).
- `skills`: `skills/` 아래의 상대 폴더이며 스킬마다 하나예요.

Release build는 교정한 plugin 폴더를 `plugin/`으로도 써요. Group은 호출할 때 파일을 가져오거나, 설치하거나, 나열하지 않아요.

Release build는 `scripts/build-release.mjs`(`pnpm run release`)예요. `release/upstream.json`에 고정된 release(moai-adk tag `v3.1.2`와 sha256)를 읽고, sha256이 다른 release 파일는 거부하며, 다음을 써요.

- `maker/index.json`: moai agent(`.claude/agents/moai/*.md`, `name`은 frontmatter에서 가져와요)와 moai skill(`SKILL.md`가 있는 `.claude/skills/moai*/`)이에요. 그 파일들은 `maker/agents`, `maker/skills`에 있어요.
- `plugin/hooks/hooks.json`: release `.claude/settings.json`의 hook 등록을 `${CLAUDE_PLUGIN_ROOT}/hooks/moai/`로 옮겨요. `plugin/hooks/moai/`에는 그 등록이 실행하는 script가 있어요.
- `maker/settings.json`: release 설정 중 hook 등록이 아닌 부분이에요.
- `maker/seed/index.json`: 릴리스 빌드가 쓰며, `version`은 고정한 릴리스 태그이고 `files`는 `maker/seed/.moai` 기준 상대 경로 목록이에요. 정렬되어 있고, template은 `.tmpl` 접미사를 유지해요. plugin modules 경로는 폴더를 나열하지 않으므로 페이지가 이 목록을 읽어요.
- `maker/seed/.moai`: release `.moai` 폴더예요. Template은 렌더링하지 않았어요. 페이지가 `.tmpl` 8개를 프로젝트 값으로 렌더링해요. `ProjectName`은 폴더 이름이에요. Git 값은 `.git/config`에서 와요(moai의 `detectGitConfig` 규칙이에요. remote가 없으면 manual, remote가 있으면 personal이고, origin host가 provider를 정해요). `ConversationLanguage`와 출력 언어는 페이지 문서의 `navigator.language` 기본 언어 부분이에요. 웹 뷰가 보고하는 시스템 언어예요(core는 응용 프로그램 locale을 선언하지 않아요). moai의 언어 집합(`ko`, `en`, `ja`, `zh`, `es`, `fr`, `de`)에 없는 언어는 이름과 집합을 적은 오류로 거부하고, 파일을 쓰지 않아요. `UserName`은 비어 있어요. init에는 user name 플래그가 없기 때문이에요. `DevelopmentMode`는 `tdd`, `TestCoverageTarget`은 85, `EnforceQuality`는 true예요. 이것은 init 기본값이에요(`internal/template/context.go`, `internal/cli/init.go`). `CreatedAt`은 시드 시각이고, `Version`은 고정된 `v3.1.2`, `ResolvedMoaiPath`는 `$MOAI_HOME/bin/moai`예요. group이 설정한 변수로 agent 프로세스의 shell이 펼쳐서, 프로젝트에는 home 폴더가 들어가지 않아요. 사용자는 설정 화면에서 이 값을 바꿔요.

페이지는 페이지를 열 때마다 프로젝트를 시드하고, 없는 파일만 써요. files sidecar로 `.moai/`를 나열하고, 없는 파일의 폴더마다 `createFolder`(멱등)를 보내고, 없는 파일마다 `write`를 `expect: null`로 보내며, 있는 파일은 그대로 두어요. 보고에 쓴 파일과 남긴 파일을 적어요. 시드가 완전하면 두 번째 실행은 `createFolder`와 `write`를 보내지 않아요. `init`은 실행하지 않아요. `.git`이 폴더가 아니면 remote를 읽을 수 없으므로 거부해요.

`.claude/hooks/moai/` 밖의 script를 실행하는 등록은 build를 실패시켜요. Hook 코드가 쓰는 프로젝트 `settings.local.json`은 이 build가 바꾸지 않아요. Agent는 `--setting-sources user`로 실행하므로 claude가 그 파일을 읽지 않아요(club.md, 측정 I4와 M5). 각 등록 명령의 fallback은 script가 없을 때만 실행되고, log 폴더를 `CLAUDE_PROJECT_DIR`에서 정해요. 명령이 script 경로에 이미 쓰는 변수예요. Build는 `d="${0%/.claude/hooks/moai/*}"`를 `d="${CLAUDE_PROJECT_DIR}"`로 고쳐요. Plugin 경로에는 프로젝트 폴더가 없기 때문이에요.

## Group 함수

`ui/makers/moai.js`는 `group()`을 내보내요. 이 함수는 plugin modules 경로로 `maker/index.json`을 읽어요. module 기준 `../../maker/index.json`이에요. 그리고 다음을 돌려줘요.

- `id`와 `name`: `moai`.
- `plugin`: `plugin`, 교정한 plugin 폴더예요.
- `clis`: `claude`만 있어요.
- `agents`와 `skills`: 배포된 index의 목록이에요.
- `variables`: `MOAI_HOME`을 `{home}/.moai`로 두어요.
- `path`: `bin`이에요. Agent 프로세스가 `PATH` 앞에 붙이는 폴더예요.
- `folders`: `.moai/`예요. Group이 프로젝트에 만드는 폴더예요.
- `rules`: 위치 규칙 한 줄이에요. moai의 생성물은 `.moai/` 아래에만 써요.

읽기가 실패하거나 index가 모양에 맞지 않으면, index URL과 field를 적은 오류로 거부해요. Group에는 `port` field가 없어요. `moai web` 서버 하나가 실행 하나를 맡고, 그 실행이 port를 정하기 때문이에요.

Package `files`는 `ui`와 `maker`를 실어서 release가 둘 다 담아요.
