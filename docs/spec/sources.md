# Sources and forks

This plugin reads and writes moai data through the files sidecar and runs the unmodified moai CLI. It does not change moai-adk.

## Rule

A fork is the last choice. It is taken only when a feature cannot be built inside the plugin or through the unmodified CLI. Each checklist item states why no fork is needed.

## Where rules live

- A rule that the moai CLI enforces is restated in plugin code only when no CLI command returns its result. The plugin code names the upstream source file of each restated rule.
- A rule that only the moai web console enforces is implemented in plugin code, with a test per rule and the upstream source file that it follows.
- The plugin pins the moai release it works with. Its checklist names that release.
