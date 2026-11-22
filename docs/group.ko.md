# moai group

[English](group.md)

moai group은 이 plugin이 agents plugin의 extension point `agents.makers`에 기여하는 메이커 group이에요([메이커 group](https://github.com/min-0-max/soksak-plugin-agents/blob/main/docs/spec/makers.md)).

## 배포된 index

이 plugin의 release build는 `ui` 폴더 옆에 `maker/index.json`을 써요. 이 파일은 고정된 revision의 upstream moai 원본을 가져와 교정한 copy의 agent와 스킬을 담아요.

- `agents`: agent마다 `name`, `path`(`agents/` 아래의 상대 경로이며 `.md`로 끝나요), `cli`(`claude`)를 가져요.
- `skills`: `skills/` 아래의 상대 폴더이며 스킬마다 하나예요.

Release build는 교정한 plugin 폴더를 `plugin/`으로도 써요. Group은 호출할 때 파일을 가져오거나, 설치하거나, 나열하지 않아요.

Release build는 `scripts/build-release.mjs`(`pnpm run release`)예요. `release/upstream.json`에 고정된 release(moai-adk tag `v3.1.2`와 sha256)를 읽고, sha256이 다른 release 파일는 거부하며, 다음을 써요.

- `maker/index.json`: moai agent(`.claude/agents/moai/*.md`, `name`은 frontmatter에서 가져와요)와 moai skill(`SKILL.md`가 있는 `.claude/skills/moai*/`)이에요. 그 파일들은 `maker/agents`, `maker/skills`에 있어요.
- `plugin/hooks/hooks.json`: release `.claude/settings.json`의 hook 등록을 `${CLAUDE_PLUGIN_ROOT}/hooks/moai/`로 옮겨요. `plugin/hooks/moai/`에는 그 등록이 실행하는 script가 있어요.
- `maker/settings.json`: release 설정 중 hook 등록이 아닌 부분이에요.

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
