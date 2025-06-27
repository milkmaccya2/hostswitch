# HostSwitch Development Guide

This document contains development guidelines and improvement plans for the HostSwitch project. It's designed to enable parallel development across multiple sessions without conflicts.

## Project Overview

HostSwitch is a CLI tool for managing multiple hosts file profiles. Current version: 1.0.2

### Key Files
- `hostswitch.js` - Main application file (282 lines)
- `package.json` - Project configuration
- `README.md` - Japanese documentation
- `README.en.md` - English documentation

## Development Principles

1. **No Breaking Changes** - Maintain backward compatibility
2. **Test First** - Write tests before implementing features
3. **Modular Development** - Work on isolated components
4. **Clear Communication** - Document all changes clearly
5. **Clean Commits** - Never commit auto-generated files

## Git and Commit Guidelines

### ❌ Never Commit These Files
```bash
# Auto-generated files
coverage/          # Jest coverage reports
*.lcov             # Coverage data
dist/              # Build outputs
build/             # Build outputs
out/               # Build outputs

# IDE/Editor files (unless project-specific)
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store          # Already in .gitignore
Thumbs.db
Desktop.ini

# Temporary files
*.tmp
*.temp
.cache/
```

### ✅ Best Practices
1. **Review before commit**: Always run `git diff --staged`
2. **Selective staging**: Use `git add <specific-files>` instead of `git add .`
3. **Check status**: Run `git status` to see what will be committed
4. **Update .gitignore**: Add patterns for new auto-generated files

### Commit Message Format
```
type(scope): description

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Parallel Work Guidelines

### Branch Strategy
- `main` - Production ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `refactor/*` - Code improvements
- `docs/*` - Documentation updates

### File Ownership Rules
To avoid conflicts, each parallel session should work on different files:

1. **Core Refactoring** - Creates new files, doesn't modify `hostswitch.js` directly
2. **Testing** - Works in `test/` directory only
3. **CI/CD** - Works in `.github/` directory only
4. **Documentation** - Works on `*.md` files only
5. **Configuration** - Works on config files (`.eslintrc`, `tsconfig.json`, etc.)

## Current Architecture

```
hostswitch/
├── hostswitch.js          # Main file - DO NOT MODIFY DIRECTLY
├── package.json           # Coordinate changes through issues
├── package-lock.json      # Auto-generated
├── README.md              # Documentation team
├── README.en.md           # Documentation team
├── LICENSE                # Do not modify
├── .gitignore            # Coordinate changes
└── .npmignore            # Coordinate changes
```

## Improvement Tasks

### Phase 1: Foundation (Immediate Priority)

#### Task 1.1: Test Infrastructure
**Owner**: Session A
**Directory**: `test/`
**Files to create**:
- `test/unit/HostSwitch.test.js`
- `test/integration/commands.test.js`
- `test/fixtures/`
- `jest.config.js`

**Dependencies**: None
**Conflicts**: None

#### Task 1.2: CI/CD Setup
**Owner**: Session B
**Directory**: `.github/workflows/`
**Files to create**:
- `.github/workflows/test.yml`
- `.github/workflows/release.yml`
- `.github/workflows/security.yml`

**Dependencies**: Tests must exist
**Conflicts**: None

#### Task 1.3: Code Quality Tools
**Owner**: Session C
**Directory**: Root
**Files to create**:
- `.eslintrc.json`
- `.prettierrc`
- `.editorconfig`
- `.husky/`

**Dependencies**: None
**Conflicts**: package.json (coordinate)

### Phase 2: Architecture (High Priority)

#### Task 2.1: TypeScript Migration Preparation
**Owner**: Session D
**Directory**: `src/`
**Files to create**:
- `tsconfig.json`
- `src/types/index.ts`
- `src/lib/` (new modules)

**Dependencies**: Phase 1 complete
**Conflicts**: None (new files only)

#### Task 2.2: Module Extraction
**Owner**: Session E
**Directory**: `src/lib/`
**Files to create**:
- `src/lib/ProfileManager.js`
- `src/lib/HostsManager.js`
- `src/lib/BackupManager.js`
- `src/lib/ConfigManager.js`

**Dependencies**: None
**Conflicts**: None (new files only)

### Phase 3: Features (Medium Priority)

#### Task 3.1: Documentation Enhancement
**Owner**: Session F
**Directory**: `docs/`
**Files to create**:
- `CONTRIBUTING.md`
- `docs/API.md`
- `docs/TROUBLESHOOTING.md`
- `docs/CHANGELOG.md`

**Dependencies**: None
**Conflicts**: None

#### Task 3.2: Shell Completions
**Owner**: Session G
**Directory**: `completions/`
**Files to create**:
- `completions/hostswitch.bash`
- `completions/hostswitch.zsh`
- `completions/hostswitch.fish`

**Dependencies**: None
**Conflicts**: None

## Coordination Protocol

### Before Starting Work
1. Check this file for updates
2. Claim your task by adding your session ID
3. Create your feature branch
4. Work only in assigned directories

### During Development
1. Commit frequently with clear messages
2. Push to your feature branch
3. Don't modify files outside your scope
4. If you need changes in other areas, document in `REQUESTS.md`

### After Completing Work
1. Update this file with completion status
2. Create a pull request
3. Document any API changes
4. Update relevant documentation

## Communication Files

### REQUESTS.md
Document requests for other sessions:
```markdown
## Requests

### From: Session A
**To**: Core team
**Request**: Need ProfileManager.validate() method
**Reason**: Required for test implementation
**Priority**: High
```

### STATUS.md
Track overall progress:
```markdown
## Status Report

### Phase 1
- [ ] Test Infrastructure (In Progress - Session A)
- [ ] CI/CD Setup (Not Started)
- [ ] Code Quality Tools (Not Started)
```

## Testing Guidelines

### Running Tests
```bash
npm test                 # Run all tests
npm test -- --watch     # Watch mode
npm test -- --coverage  # Coverage report
```

### Test Structure
```javascript
describe('HostSwitch', () => {
  describe('ProfileManager', () => {
    it('should create profile with valid name', () => {
      // Test implementation
    });
  });
});
```

## Code Style Guidelines

### JavaScript (Current)
- Use ES6+ features
- Consistent error handling
- Clear variable names
- Comment complex logic

### TypeScript (Future)
- Strict mode enabled
- Explicit return types
- Interface over type aliases
- Proper error types

## Security Guidelines

1. Always validate user input
2. Use path.join() for file paths
3. Check permissions before operations
4. Never expose system information
5. Sanitize profile names

## Version Management

Current version: 1.0.2

### Version Bump Rules
- Patch (1.0.x): Bug fixes, documentation
- Minor (1.x.0): New features, non-breaking changes
- Major (x.0.0): Breaking changes (avoid)

## Questions?

If you need clarification or encounter conflicts:
1. Document in `QUESTIONS.md`
2. Check existing issues
3. Coordinate through PR comments

---

Last Updated: 2025-06-27
Maintained by: Claude Development Team