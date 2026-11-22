# moai group

[한국어](group.ko.md)

The moai group is the maker group that this plugin contributes to the extension point `agents.makers` of the agents plugin ([maker groups](https://github.com/min-0-max/soksak-plugin-agents/blob/main/docs/spec/makers.md)).

## Shipped index

The release build of this plugin writes `maker/index.json` beside the `ui` folder. It holds the agents and skills of the corrected copy of the upstream moai source, which the release build fetches at the pinned revision:

- `agents`: one object per agent with `name`, `path` (a relative path under `agents/` that ends in `.md`) and `cli` (`claude`).
- `skills`: relative folders under `skills/`, one per skill.

The release build also writes the corrected plugin folder as `plugin/`. The group does not fetch, install or list files at call time.

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
