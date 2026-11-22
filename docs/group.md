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
