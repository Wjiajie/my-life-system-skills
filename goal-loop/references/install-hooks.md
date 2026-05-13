# Goal Loop Hook Installation

Copy the scripts from this skill's `scripts/hooks/` directory into the target project, then reference them from the project `.codex/config.toml`.

Example:

```toml
[features]
codex_hooks = true

[[hooks.UserPromptSubmit]]
[[hooks.UserPromptSubmit.hooks]]
type = "command"
command = '/usr/bin/python3 "/ABSOLUTE/PATH/TO/PROJECT/.codex/hooks/goal_loop_prompt.py"'
timeout = 10
statusMessage = "Checking goal-loop prompt"

[[hooks.SessionStart]]
matcher = "startup|resume"
[[hooks.SessionStart.hooks]]
type = "command"
command = '/usr/bin/python3 "/ABSOLUTE/PATH/TO/PROJECT/.codex/hooks/goal_loop_context.py"'
timeout = 10
statusMessage = "Loading goal-loop context"

[[hooks.Stop]]
[[hooks.Stop.hooks]]
type = "command"
command = '/usr/bin/python3 "/ABSOLUTE/PATH/TO/PROJECT/.codex/hooks/goal_loop_stop.py"'
timeout = 30
statusMessage = "Checking goal-loop completion"
```

Use absolute paths. Do not rely on `git rev-parse` inside hook commands because some Codex sessions run outside a discoverable Git root.
