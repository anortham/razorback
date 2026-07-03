# Codex Plugin Docs Grounding

Lead Gate 0 result for `docs/plans/2026-07-03-codex-parallelism-and-plugin-implementation.md`.

## Sources Checked

- Fresh Codex manual fetched through `openai-docs` helper on 2026-07-03:
  - `https://developers.openai.com/codex/plugins/build`
  - `https://developers.openai.com/codex/plugins`
  - `https://developers.openai.com/codex/skills`
  - `https://developers.openai.com/codex/hooks`
- Bundled Codex `plugin-creator` skill:
  - `/Users/murphy/.codex/skills/.system/plugin-creator/SKILL.md`
  - `/Users/murphy/.codex/skills/.system/plugin-creator/references/plugin-json-spec.md`
  - `/Users/murphy/.codex/skills/.system/plugin-creator/scripts/create_basic_plugin.py`
  - `/Users/murphy/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py`

## Grounded Decisions

- Plugin manifest location: `.codex-plugin/plugin.json`.
- Plugin manifest required core fields: `name`, `version`, `description`, `skills`; the bundled validator also requires `author` and `interface`.
- Manifest `version`: required on `.codex-plugin/plugin.json` and must be strict semver.
- Skill path: `skills` should be a relative path such as `./skills/`.
- Interface assets: local relative asset paths are supported through `interface.composerIcon`, `interface.logo`, and `interface.logoDark`. Referenced asset files must exist inside the plugin archive.
- Marketplace location: repo-scoped marketplaces use `$REPO_ROOT/.agents/plugins/marketplace.json`; personal marketplaces use `~/.agents/plugins/marketplace.json`.
- Marketplace source path: `plugins[].source.path` is a `./`-prefixed local path resolved relative to the marketplace root, not relative to `.agents/plugins/`.
- Marketplace policy fields: each entry should include `policy.installation`, `policy.authentication`, and `category`.
- Marketplace version field: no source requires or documents a marketplace `version`; do not add one.
- Per-skill OpenAI metadata: `skills/*/agents/openai.yaml` is optional UI/tool-dependency metadata. It is not required for this plugin.
- Hook field: do not add an object-form `hooks` field. The current plugin-creator validation contract rejects unsupported manifest fields including `hooks`; because Razorback is not bundling Codex lifecycle hooks in this task, the plugin manifest should omit `hooks` and the package should not include a `hooks/` directory.

## Plan Revisions Required

The approved plan's earlier assumption that `.codex-plugin/plugin.json` should include an empty `hooks` object is stale. Update Task 2 and Task 3 to assert that the Codex manifest omits `hooks`, and keep package exclusion of hook files/directories.
