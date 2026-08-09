# Contributing to HostSwitch

Thanks for considering a contribution! This document covers the basics for
human contributors. If you're an AI coding agent working in this repo, see
[CLAUDE.md](CLAUDE.md) for more detailed architecture and workflow notes.

Found a security issue instead? Please see [SECURITY.md](SECURITY.md) rather
than opening a public issue or PR.

## Getting Started

```bash
# Clone your fork
git clone https://github.com/<you>/hostswitch.git
cd hostswitch

# Install dependencies
npm install

# Run the CLI directly against TypeScript source, without building
npm run dev -- list

# Or build once and run the compiled output
npm run build
npm start -- list
```

While iterating, `npm run build:watch` recompiles on save.

## Development Flow

1. Create a branch off `main` for your change.
2. Write or update tests first where practical (see [Testing](#testing)).
3. Make your change.
4. Run `npm run check` before opening a PR — this runs linting, format
   checking, and the full test suite, and is the same gate CI enforces.
5. Open a PR using the provided template.

## Testing

The project follows t-wada-style TDD: write a failing test, make it pass
with minimal code, then refactor with the test still green.

- Core business logic (`ProfileManager`, `CurrentProfileManager`,
  `BackupManager`, `HostSwitchService`) lives under `src/core/` and **must**
  have unit test coverage in `src/core/__tests__/`.
- All external dependencies (file system, logging, process execution) are
  injected via interfaces, so core logic can be tested without touching the
  real file system — use the mocks in `src/__mocks__/` rather than the real
  `IFileSystem`/`IProcessManager` implementations.
- Prefer testing individual managers directly over exercising the same
  logic indirectly through `HostSwitchService`; reserve
  `HostSwitchService` tests for integration/coordination scenarios.

```bash
npm test               # watch mode
npm run test:run       # single run
npm run test:coverage  # coverage report
```

## Code Style

Formatting and linting are enforced by [Biome](https://biomejs.dev/):
2-space indentation, single quotes, semicolons, 100-character line width.

```bash
npm run lint:fix   # auto-fix lint + formatting issues
npm run format     # format only
```

## Manual Testing Warning

`hostswitch switch` (and `use`) actually overwrite your system hosts file
(`/etc/hosts` on macOS/Linux, `C:\Windows\System32\drivers\etc\hosts` on
Windows) and require sudo/administrator privileges to do so.

**Before manually testing `switch`, back up your current hosts file**, e.g.:

```bash
sudo cp /etc/hosts /etc/hosts.bak
```

hostswitch does create its own automatic backups under
`~/.hostswitch/backups/`, but taking your own backup first is cheap
insurance while you're testing changes to the switching logic itself.

## Pull Requests

- Keep PRs focused on a single change where possible.
- Make sure `npm run check` passes.
- Update relevant documentation (README, docs site under `website/`, etc.)
  if behavior changes.

## Releasing (maintainers)

Releases publish to npm via `.github/workflows/publish.yml`, which runs
when a **GitHub Release** is published. The published version comes from
`package.json`, **not** from the tag name — so the tag and `package.json`
must agree. Use `npm version` to keep them in sync rather than tagging by
hand:

```bash
git checkout main && git pull --ff-only origin main
npm version patch            # bumps package.json, commits "x.y.z", tags vx.y.z
git push origin main --follow-tags
gh release create vx.y.z --generate-notes   # this triggers the publish workflow
```

Tagging a commit that still has the previous `package.json` version (for
example running `git tag` without `npm version`) publishes the old version
and npm rejects it with `cannot publish over the previously published
versions`. The publish workflow now fails fast with a clear message when
the tag and `package.json` disagree, but the correct fix is always to bump
the version with `npm version`.

## Reviewing fork pull requests (maintainers)

CI does not run automatically on a pull request from a first-time
contributor's fork — GitHub holds the workflow with an `action_required`
status until a maintainer approves it. This is deliberate: `publish.yml`
runs with `id-token` and npm publish rights, and hostswitch itself runs
under `sudo`, so letting unreviewed fork code trigger workflows is a risk
we don't want to take. The approval gate stays on.

When a fork PR comes in:

1. **Read the diff first**, before approving CI. Pay attention to anything
   touching `.github/workflows/`, `package.json`, `package-lock.json`, or
   install scripts — those are the parts that could abuse the CI
   environment. A docs- or source-only change is low risk.
2. Approve the run once the diff looks safe:

   ```bash
   gh run list --branch <fork-branch> --json databaseId,conclusion \
     --jq '.[] | select(.conclusion=="action_required") | .databaseId'
   gh api -X POST repos/milkmaccya2/hostswitch/actions/runs/<id>/approve
   ```

   (or click **Approve and run** on the PR's Checks tab).
3. Let the matrix finish, then review and merge as usual.

The `main` branch requires the `Lint, Build & Test` check to pass, so a PR
can't be merged until its CI has been approved and is green.
