# Goal Loop Hook Installation

Copy the scripts from this skill's `scripts/hooks/` directory into the target project, then reference them from the project `.codex/config.toml`.

For global installation, prefer the ready-to-copy examples in:

- `resources/windows-global-config.toml`
- `resources/macos-global-config.toml`

Use global config when you want Goal Loop available in every Codex project. Use
project-local `.codex/config.toml` only when you want the hooks limited to one
repository.

Project-local example:

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
