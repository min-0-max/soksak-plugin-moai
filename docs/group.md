# moai group

[한국어](group.ko.md)

The moai group is the maker group that this plugin contributes to the extension point `agents.makers` of the agents plugin ([maker groups](https://github.com/min-0-max/soksak-plugin-agents/blob/main/docs/spec/makers.md)).

## Shipped index

The release build of this plugin writes `maker/index.json` beside the `ui` folder. It holds the agents and skills of the corrected copy of the upstream moai source, which the release build fetches at the pinned revision:

- `agents`: one object per agent with `name`, `path` (a relative path under `agents/` that ends in `.md`, for example `agents/moai/manager-spec.md`), `cli` (`claude`), and `model` when the definition has a `model:` line. The build moves that value into the index and removes the line from the copied definition, because `model:` overrides the session model (club.md, measurement C4); agents applies the value to the session (makers.md).
- `skills`: relative folders under `skills/`, one per skill, for example `skills/moai-run`.

The release build also writes the corrected plugin folder as `plugin/`. The group does not fetch, install or list files at call time.

The release build is `scripts/build-release.mjs` (`pnpm run release`). It reads the release pinned in `release/upstream.json` (moai-adk tag `v3.1.2`, with its sha256), refuses a release file whose sha256 differs, and writes:

- `maker/index.json` with the moai agents (`.claude/agents/moai/*.md`, `name` from the frontmatter) and the moai skills (`.claude/skills/moai*/` that hold a `SKILL.md`), and `maker/agents`, `maker/skills` with those files;
- `plugin/hooks/hooks.json`, which moves each hook registration of the release `.claude/settings.json` to `${CLAUDE_PLUGIN_ROOT}/hooks/moai/`, and `plugin/hooks/moai/` with the scripts those registrations run;
- `maker/settings.json`, the settings of the release that are not hook registrations.
- `maker/seed/index.json`, written by the release build: `version` is the pinned release tag and `files` lists each file of the seed relative to `maker/seed/.moai`, sorted, with a template keeping its `.tmpl` suffix. The page reads this list because the plugin modules path lists no folder.
- `maker/seed/.moai`, the release `.moai` folder with its templates unrendered. The page renders the eight `.tmpl` files with the project values: `ProjectName` is the folder name; the git values come from `.git/config` (moai's `detectGitConfig` rules: no remote is manual, any remote is personal, the origin host sets the provider); `ConversationLanguage` and the output languages are the primary subtag of `navigator.language` of the page document, the system language that the web view reports (the core declares no application locale); a language outside moai's set (`ko`, `en`, `ja`, `zh`, `es`, `fr`, `de`) is refused with an error that names it and the set, and no file is written; `UserName` is empty, because init has no user name flag; `DevelopmentMode` is `tdd`, `TestCoverageTarget` is 85 and `EnforceQuality` is true, the init defaults (`internal/template/context.go`, `internal/cli/init.go`); `CreatedAt` is the seed time; `Version` is the pinned `v3.1.2`; `ResolvedMoaiPath` is `$MOAI_HOME/bin/moai`, which the shell of the agent process expands with the variable that the group sets, so the project holds no home folder. The person changes these values in the settings screen.

The page seeds the project at each page start, and writes only what is missing. It lists `.moai/` through the files sidecar, creates each folder of a missing file with `createFolder` (idempotent), writes each missing file with `write` and `expect: null`, and keeps each existing file as it is; the report names the written and the kept files. A second run over a complete seed sends no `createFolder` and no `write`. `init` never runs. A `.git` that is not a folder is refused, because the remote cannot be read from it.

A registration that runs a script outside `.claude/hooks/moai/` fails the build. The project `settings.local.json` that the hook code writes is not changed by this build: agents run with `--setting-sources user`, so claude does not read that file (club.md, measurements I4 and M5). The fallback of each registration command, which runs only when its script is missing, takes the log folder from `CLAUDE_PROJECT_DIR`, the variable that the command already uses for the script path. The build rewrites `d="${0%/.claude/hooks/moai/*}"` to `d="${CLAUDE_PROJECT_DIR}"` for that reason: the plugin path has no project folder in it.

## Group function

`ui/makers/moai.js` exports `group()`. It reads `maker/index.json` through the plugin modules path, at `../../maker/index.json` relative to the module, and returns:

- `id` and `name`: `moai`.
- `plugin`: `plugin`, the corrected plugin folder.
- `clis`: `claude` only.
- `agents` and `skills`: the lists of the shipped index.
- `variables`: `MOAI_HOME` set to `{home}/.moai`.
- `path`: `bin`, the folder that the agent process prepends to `PATH`.
- `folders`: `.moai/`, the folder that the group creates in the project.
- `rules`: one location rule, which says that the outputs of moai go only under `.moai/`.

A failed read, or an index that does not match the shape, rejects with an error that names the index URL and the field. The group holds no `port` field: one `moai web` server serves each launch, and the launch chooses its port.

The package `files` ships `ui` and `maker`, so the release holds both.
