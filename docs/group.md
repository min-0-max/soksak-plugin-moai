# moai group

[한국어](group.ko.md)

The moai group is the maker group that this plugin contributes to the extension point `agents.makers` of the agents plugin ([maker groups](https://github.com/min-0-max/soksak-plugin-agents/blob/main/docs/spec/makers.md)).

## Maker folder

The release build of this plugin writes `plugin/`, the maker folder of the group. A session of a moai agent loads it with `--plugin-dir` and `--add-dir` (agents makers.md), so no project receives a copy of moai and the texts call the agents, skills and commands by their own names, without a namespace. The build is `scripts/build-release.mjs` (`pnpm run release`). It reads the release pinned in `release/upstream.json` (moai-adk tag `v3.1.2`, with its sha256) and the pinned darwin-arm64 binary release file, refuses a file whose sha256 differs, and writes:

- `plugin/.claude/agents/moai/*.md`, the moai agents. Each file keeps its text and its `model:` line, because the session runs the agent as a subagent from this file. Each agent hook of the frontmatter runs `$MOAI_PLUGIN/hooks/moai/<script>` with `$MOAI_PLUGIN/bin` on its `PATH`, because a hook of a folder added with `--add-dir` has no `CLAUDE_PLUGIN_ROOT`. A hook that names another project path under `.claude/` fails the build.
- `plugin/.claude/skills/moai*/` that hold a `SKILL.md`, `plugin/.claude/commands/moai/`, `plugin/.claude/output-styles/moai/`, `plugin/.claude/workflows/` and `plugin/.claude/rules/`, unchanged, because the texts name these files by their `.claude` paths.
- `plugin/hooks/hooks.json`, which moves each hook registration of the release `.claude/settings.json` to `${CLAUDE_PLUGIN_ROOT}/hooks/moai/`, and `plugin/hooks/moai/` with the scripts that the registrations and the agent hooks run. Each registration script starts with `PATH="${CLAUDE_PLUGIN_ROOT}/bin:$PATH"`, because a plugin hook runs without the plugin `bin/` on its `PATH` and the scripts look for `moai` on `PATH`.
- `plugin/bin/moai`, the moai binary of the binary release file, with `plugin/bin/moai.LICENSE` and, when the file holds one, `plugin/bin/moai.NOTICE`.
- `plugin/.claude-plugin/plugin.json`, the manifest that `--plugin-dir` reads, and `plugin/LICENSE`, the Apache-2.0 LICENSE of moai-adk.

Each registration and agent hook sets `MOAI_HOOK_STDERR_LOG` to `$CLAUDE_PROJECT_DIR/.moai/logs/hook-stderr.log`, because the scripts otherwise write their error output under `$HOME/.moai/logs`. The SessionStart hook of moai writes `teammateMode` into the project `.claude/settings.local.json` (moai `ensureTeammateMode`); that file is local to the project. The fallback of each registration command, which runs only when its script is missing, takes the log folder from `CLAUDE_PROJECT_DIR`: the build rewrites `d="${0%/.claude/hooks/moai/*}"` to `d="${CLAUDE_PROJECT_DIR}"`, because the plugin path has no project folder in it. A registration that runs a script outside `.claude/hooks/moai/`, or that is not `bash -c <script> <path>`, fails the build.

## Release data

The build also writes:

- `maker/index.js`, a data module that exports `agents`: one object per moai agent with `name` (from the frontmatter), `path` (the definition in the maker folder, for example `.claude/agents/moai/manager-spec.md`), `cli` (`claude`) and `model` when the definition has a `model:` line. agents applies the model to a member session.
- `maker/moai.js`, the group module that `plugin.json` contributes: the source `src/group.js` and the data module bundled with esbuild into one file with no import, because core grants a provider page only the contributed module file.
- `maker/settings.json`, the settings of the release that are not hook registrations.
- `maker/seed/index.json`, written by the release build: `version` is the pinned release tag and `files` lists each file of the seed relative to `maker/seed/.moai`, sorted, with a template keeping its `.tmpl` suffix. The page reads this list because the plugin modules path lists no folder.
- `maker/seed/.moai`, the release `.moai` folder with its templates unrendered. The page renders the eight `.tmpl` files with the project values: `ProjectName` is the folder name; the git values come from `.git/config` (moai's `detectGitConfig` rules: no remote is manual, any remote is personal, the origin host sets the provider); `ConversationLanguage` and the output languages are the primary subtag of `navigator.language` of the page document, the system language that the web view reports (the core declares no application locale); a language outside moai's set (`ko`, `en`, `ja`, `zh`, `es`, `fr`, `de`) is refused with an error that names it and the set, and no file is written; `UserName` is empty, because init has no user name flag; `DevelopmentMode` is `tdd`, `TestCoverageTarget` is 85 and `EnforceQuality` is true, the init defaults (`internal/template/context.go`, `internal/cli/init.go`); `CreatedAt` is the seed time; `Version` is the pinned `v3.1.2`; `ResolvedMoaiPath` is `$MOAI_PLUGIN/bin/moai`, which the shell of the agent process expands with the variable that the group sets to the maker folder, so the project holds no installed folder. The person changes these values in the settings screen.

The page seeds the project at each page start, and writes only what is missing. It lists `.moai/` through the files sidecar, creates each folder of a missing file with `createFolder` (idempotent), writes each missing file with `write` and `expect: null`, and keeps each existing file as it is; the report names the written and the kept files. A second run over a complete seed sends no `createFolder` and no `write`. `init` never runs. A `.git` that is not a folder is refused, because the remote cannot be read from it.

## Group function

`maker/moai.js` exports `group()`, which builds the group with `groupFrom` of `src/group.js` from the bundled data, and returns:

- `id` and `name`: `moai`.
- `plugin`: `plugin`, the maker folder relative to the installed folder of this plugin.
- `clis`: `claude` only.
- `agents`: the list of the data module.
- `variables`: `MOAI_HOME` set to `{home}/.moai` and `MOAI_PLUGIN` set to `{plugin}`, the maker folder, which the agent hooks and `ResolvedMoaiPath` use.
- `folders`: `.moai/`, the outputs of moai, and `.claude/agent-memory/`, which the agents that declare `memory: project` write.
- `rules`: one location rule, which says that the outputs of moai go only under `.moai/`.

A data module with another member, such as the `files` or `skills` of the earlier form, is refused with an error that names `maker/index.js` and the member. An agent path outside `.claude/agents/` of the maker folder is refused with an error that names the field, such as `agents[1].path`. The group holds no `port` field: one `moai web` server serves each launch, and the launch chooses its port.

The package `files` ships `ui`, `maker` and `plugin`; `src/` is not shipped, because `maker/moai.js` holds it. The surface page imports `maker/moai.js` as well.
