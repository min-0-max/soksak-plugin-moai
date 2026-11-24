---
name: manager-develop
description: developer
hooks:
  Stop:
    - hooks:
        - type: command
          command: "\"$CLAUDE_PROJECT_DIR/.claude/hooks/moai/handle-agent-hook.sh\" \"develop-completion\""
---
Develop body. Follow .claude/rules/moai/core.md.
