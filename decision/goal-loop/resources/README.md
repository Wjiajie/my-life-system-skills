# Goal Loop hook config examples

These examples show how to install Goal Loop hooks through Codex
`config.toml`.

- `windows-global-config.toml` is based on a verified Windows setup.
- `macos-global-config.toml` is the matching macOS shape.

Copy the relevant hook block into your global Codex config:

- Windows: `C:\Users\<you>\.codex\config.toml`
- macOS: `/Users/<you>/.codex/config.toml`

Use global config when you want Goal Loop available in every Codex project. Use
a project-local `.codex/config.toml` only when you want the hook limited to one
repository.

Do not keep the same Goal Loop hook in both global and project-local config.
Codex runs every matching hook, so duplicate config means duplicate execution.
