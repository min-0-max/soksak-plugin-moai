# moai group

[English](group.md)

moai group은 이 plugin이 agents plugin의 extension point `agents.makers`에 기여하는 메이커 group이에요([메이커 group](https://github.com/min-0-max/soksak-plugin-agents/blob/main/docs/spec/makers.md)).

## 메이커 폴더

이 plugin의 release build는 group의 메이커 폴더 `plugin/`을 써요. moai agent의 세션은 이 폴더를 `--plugin-dir`와 `--add-dir`로 읽어요(agents makers.md). 그래서 어떤 프로젝트에도 moai 사본이 들어가지 않고, 텍스트는 agent, skill, command를 namespace 없이 제 이름으로 불러요. Build는 `scripts/build-release.mjs`(`pnpm run release`)예요. `release/upstream.json`에 고정된 release(moai-adk tag `v3.1.2`와 sha256)와 고정된 darwin-arm64 바이너리 release 파일을 읽고, sha256이 다른 파일은 거부하고, 다음을 써요.

- `plugin/.claude/agents/moai/*.md`: moai agent예요. 파일마다 텍스트와 `model:` 줄을 그대로 둬요. 세션이 이 파일로 agent를 subagent로 실행하기 때문이에요. Frontmatter의 agent hook은 `$MOAI_PLUGIN/bin`을 `PATH`에 두고 `$MOAI_PLUGIN/hooks/moai/<script>`를 실행해요. `--add-dir`로 더한 폴더의 hook에는 `CLAUDE_PLUGIN_ROOT`가 없기 때문이에요. `.claude/` 아래의 다른 프로젝트 경로를 적은 hook은 build를 실패시켜요.
- `SKILL.md`가 있는 `plugin/.claude/skills/moai*/`, `plugin/.claude/commands/moai/`, `plugin/.claude/output-styles/moai/`, `plugin/.claude/workflows/`, `plugin/.claude/rules/`: 바꾸지 않고 복사해요. 텍스트가 이 파일들을 `.claude` 경로로 부르기 때문이에요.
- `plugin/hooks/hooks.json`: release `.claude/settings.json`의 hook 등록을 `${CLAUDE_PLUGIN_ROOT}/hooks/moai/`로 옮겨요. `plugin/hooks/moai/`에는 등록과 agent hook이 실행하는 script를 둬요. 등록 script는 `PATH="${CLAUDE_PLUGIN_ROOT}/bin:$PATH"`로 시작해요. plugin hook은 plugin `bin/`이 `PATH`에 없는 채로 실행되고, script는 `PATH`에서 `moai`를 찾기 때문이에요.
- `plugin/bin/moai`: build가 고정된 원본에 `release/patches/claude-config-dir.patch`를 적용한 뒤 Go로 compile한 darwin-arm64 moai 바이너리예요. `plugin/bin/moai.patch`와 `plugin/bin/moai.LICENSE`를 함께 써요. 이 patch는 hook과 status line이 Claude Code 설정 home을 `CLAUDE_CONFIG_DIR`에서 읽게 해요. release 바이너리는 다른 설정 home의 세션이 끝날 때 `~/.claude/tasks`의 task 폴더를 지우기 때문이에요. Build는 `Version`을 release tag로, `Commit`을 `patch-<patch sha256의 앞 16진수 12자리>`로 정하고, 적용되지 않는 patch는 그 patch를 적은 오류로 거부해요.
- `plugin/.claude-plugin/plugin.json`: `--plugin-dir`가 읽는 manifest예요. `plugin/LICENSE`는 moai-adk의 Apache-2.0 LICENSE예요.

등록과 agent hook은 모두 `MOAI_HOOK_STDERR_LOG`를 `$CLAUDE_PROJECT_DIR/.moai/logs/hook-stderr.log`로 정해요. 그러지 않으면 script가 오류 출력을 `$HOME/.moai/logs` 아래에 쓰기 때문이에요. moai의 SessionStart hook은 프로젝트 `.claude/settings.local.json`에 `teammateMode`를 써요(moai `ensureTeammateMode`). 이 파일은 그 프로젝트의 local 파일이에요. 등록 command의 fallback은 script가 없을 때만 실행되며, log 폴더를 `CLAUDE_PROJECT_DIR`에서 가져와요. plugin 경로에는 프로젝트 폴더가 없어서, build가 `d="${0%/.claude/hooks/moai/*}"`를 `d="${CLAUDE_PROJECT_DIR}"`로 바꿔요. `.claude/hooks/moai/` 밖의 script를 실행하거나 `bash -c <script> <path>` 형태가 아닌 등록은 build를 실패시켜요.

## Release 데이터

Build는 다음도 써요.

- `maker/index.js`: `agents`를 내보내는 data module이에요. moai agent마다 `name`(frontmatter에서), `path`(메이커 폴더 안의 정의. 예: `.claude/agents/moai/manager-spec.md`), `cli`(`claude`)를 가지고, 정의에 `model:` 줄이 있으면 `model`도 가져요. agents는 member 세션에 그 model을 적용해요.
- `maker/moai.js`: `plugin.json`이 기여하는 group module이에요. 원본 `src/group.js`와 data module을 esbuild로 import 없는 파일 하나로 묶어요. core가 provider 페이지에 기여한 module 파일만 허용하기 때문이에요.
- `maker/settings.json`: release 설정 중 hook 등록이 아닌 것이에요.
- `maker/seed/index.json`: 릴리스 빌드가 쓰며, `version`은 고정한 릴리스 태그이고 `files`는 `maker/seed/.moai` 기준 상대 경로 목록이에요. 정렬되어 있고, template은 `.tmpl` 접미사를 유지해요. plugin modules 경로는 폴더를 나열하지 않으므로 페이지가 이 목록을 읽어요.
- `maker/seed/.moai`: release `.moai` 폴더예요. Template은 렌더링하지 않았어요. 페이지가 `.tmpl` 8개를 프로젝트 값으로 렌더링해요. `ProjectName`은 폴더 이름이에요. Git 값은 `.git/config`에서 와요(moai의 `detectGitConfig` 규칙이에요. remote가 없으면 manual, remote가 있으면 personal이고, origin host가 provider를 정해요). `ConversationLanguage`와 출력 언어는 페이지 문서의 `navigator.language` 기본 언어 부분이에요. 웹 뷰가 보고하는 시스템 언어예요(core는 응용 프로그램 locale을 선언하지 않아요). moai의 언어 집합(`ko`, `en`, `ja`, `zh`, `es`, `fr`, `de`)에 없는 언어는 이름과 집합을 적은 오류로 거부하고, 파일을 쓰지 않아요. `UserName`은 비어 있어요. init에는 user name 플래그가 없기 때문이에요. `DevelopmentMode`는 `tdd`, `TestCoverageTarget`은 85, `EnforceQuality`는 true예요. 이것은 init 기본값이에요(`internal/template/context.go`, `internal/cli/init.go`). `CreatedAt`은 시드 시각이고, `Version`은 고정된 `v3.1.2`, `ResolvedMoaiPath`는 `$MOAI_PLUGIN/bin/moai`예요. group이 메이커 폴더로 설정한 변수를 agent 프로세스의 shell이 펼쳐서, 프로젝트에는 설치된 폴더가 들어가지 않아요. 사용자는 설정 화면에서 이 값을 바꿔요.

페이지는 페이지를 열 때마다 프로젝트를 시드하고, 없는 파일만 써요. files sidecar로 `.moai/`를 나열하고, 없는 파일의 폴더마다 `createFolder`(멱등)를 보내고, 없는 파일마다 `write`를 `expect: null`로 보내며, 있는 파일은 그대로 두어요. 보고에 쓴 파일과 남긴 파일을 적어요. 시드가 완전하면 두 번째 실행은 `createFolder`와 `write`를 보내지 않아요. `init`은 실행하지 않아요. `.git`이 폴더가 아니면 remote를 읽을 수 없으므로 거부해요.

## Group 함수

`maker/moai.js`는 `group()`을 내보내요. 이 함수는 묶인 데이터로 `src/group.js`의 `groupFrom`을 불러 group을 만들고, 다음을 돌려줘요.

- `id`와 `name`: `moai`.
- `plugin`: `plugin`. 이 plugin의 설치된 폴더 기준 메이커 폴더예요.
- `clis`: `claude`만.
- `agents`: data module의 목록.
- `variables`: `MOAI_HOME`은 `{home}/.moai`, `MOAI_PLUGIN`은 메이커 폴더 `{plugin}`이에요. agent hook과 `ResolvedMoaiPath`가 `MOAI_PLUGIN`을 써요.
- `folders`: moai 출력의 `.moai/`, 그리고 `memory: project`를 선언한 agent가 쓰는 `.claude/agent-memory/`.
- `rules`: moai 출력은 `.moai/` 아래에만 둔다는 위치 규칙 하나.

다른 member가 있는 data module은 `maker/index.js`와 그 member를 적은 오류로 거부해요. 이전 형태의 `files`나 `skills`가 그 예예요. 메이커 폴더의 `.claude/agents/` 밖에 있는 agent 경로는 `agents[1].path`처럼 field를 적은 오류로 거부해요. Group에는 `port` field가 없어요. 실행마다 `moai web` 서버 하나가 응답하고, 그 실행이 port를 정해요.

Package `files`는 `ui`, `maker`, `plugin`을 실어요. `src/`는 싣지 않아요. `maker/moai.js`가 그 내용을 담고 있기 때문이에요. Surface 페이지도 `maker/moai.js`를 import해요.
