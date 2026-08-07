# Contributing to HostSwitch

Thanks for contributing. This guide covers setup, quality checks, tests, and the PR workflow.

## Getting started

Prerequisites:

- Node.js 20 or newer
- npm

```bash
git clone https://github.com/milkmaccya2/hostswitch.git
cd hostswitch
npm install
```

## Development flow

```bash
npm run build              # Compile TypeScript
npm run dev -- list        # Run the CLI from source
npm run build:watch        # Rebuild on changes
```

Before opening a PR, run the full quality gate:

```bash
npm run check
```

`npm run check` runs Biome lint, Biome format check, and the Vitest suite once.

## Code style

HostSwitch uses Biome with these rules:

- 2 spaces indentation
- Single quotes
- Semicolons always
- 100 character line width
- Alphabetical imports with explicit type imports
- Node.js protocol for built-in modules (`node:fs`)

Use `npm run lint:fix` to auto-fix formatting and lint issues.

## Tests

- Unit tests live next to the source in `__tests__` directories.
- The project follows t-wada TDD: write a failing test first, then make it pass, then refactor.
- Core layers should have focused unit tests instead of testing everything through one service.
- External dependencies are abstracted through interfaces so tests do not touch the real filesystem.

Commands:

```bash
npm run test:run          # Run tests once
npm run test:coverage     # Run tests with coverage
npm run test:ui           # Open the Vitest UI
```

## Manual testing

`hostswitch switch` and `hostswitch use` modify the real system hosts file with sudo/admin. Before manual testing:

1. Back up `/etc/hosts` (or the Windows hosts file).
2. Verify the current profile with `hostswitch show`.
3. Switch back after the test and check `hostswitch list`.

Never add a test that modifies the real hosts file.

## Pull requests

- Keep changes focused and reference the related issue.
- Add or update tests for behavior changes.
- Run `npm run check` before pushing.
- Update `README.md` or `README.ja.md` when user-facing behavior changes.
- Sign commits with `git commit -s` for DCO.
- Reply to review comments in the PR and update the branch when needed.

## Security

Do not report vulnerabilities in public issues. See [SECURITY.md](SECURITY.md) and use GitHub Private Vulnerability Reporting.
