# Parallel Work Guide for HostSwitch Development

This guide helps multiple developers/sessions work on HostSwitch simultaneously without conflicts.

## Quick Start

1. **Choose a Task**: Check `STATUS.md` for available tasks
2. **Claim Your Task**: Update `STATUS.md` with your session ID
3. **Create Branch**: `git checkout -b feature/task-name`
4. **Work in Your Area**: Only modify files in your assigned directory
5. **Communicate**: Use `REQUESTS.md` for cross-session needs

## Available Tasks (Ready to Start)

### 🧪 Session A: Test Infrastructure
**Branch**: `feature/test-infrastructure`
**Working Directory**: `test/`
**Can Start**: Immediately

```bash
# Start with:
mkdir -p test/unit test/integration test/fixtures
npm install --save-dev jest @types/jest

# Create initial test files:
# - test/unit/HostSwitch.test.js
# - test/integration/commands.test.js
# - jest.config.js
```

### 🔧 Session B: ESLint & Prettier Setup
**Branch**: `feature/code-quality`
**Working Directory**: Root (config files only)
**Can Start**: Immediately

```bash
# Start with:
npm install --save-dev eslint prettier eslint-config-prettier

# Create:
# - .eslintrc.json
# - .prettierrc
# - .editorconfig
```

### 📚 Session C: Documentation Enhancement
**Branch**: `docs/enhancement`
**Working Directory**: `docs/`
**Can Start**: Immediately

```bash
# Start with:
mkdir docs

# Create:
# - CONTRIBUTING.md
# - docs/API.md
# - docs/TROUBLESHOOTING.md
```

### 🔄 Session D: GitHub Actions CI
**Branch**: `feature/github-actions`
**Working Directory**: `.github/`
**Can Start**: Immediately

```bash
# Start with:
mkdir -p .github/workflows

# Create:
# - .github/workflows/test.yml
# - .github/workflows/release.yml
```

### 🐚 Session E: Shell Completions
**Branch**: `feature/shell-completions`
**Working Directory**: `completions/`
**Can Start**: Immediately

```bash
# Start with:
mkdir completions

# Create:
# - completions/hostswitch.bash
# - completions/hostswitch.zsh
# - completions/hostswitch.fish
```

## Coordination Examples

### Example 1: Test Writer Needs New API

Session A (Tests) needs a new method in the main code:

1. **Session A** adds to `REQUESTS.md`:
   ```markdown
   ### Request: Test needs ProfileManager.validate()
   Need a validation method for profile names
   ```

2. **Core Team** sees request and implements in their branch

3. **Session A** can mock the method temporarily:
   ```javascript
   // Mock until implemented
   jest.mock('../src/lib/ProfileManager', () => ({
     validate: jest.fn(() => true)
   }));
   ```

### Example 2: Documentation Needs Error Codes

Session C (Docs) needs standardized error codes:

1. **Session C** documents current errors in `docs/TROUBLESHOOTING.md`
2. Adds request in `REQUESTS.md` for standardized codes
3. Continues with placeholders like `[ERROR_CODE_TBD]`

## Conflict Prevention Rules

### ❌ Never Do This
```bash
# Don't modify the main file directly
edit hostswitch.js  # ❌ WRONG

# Don't modify another session's files
edit test/unit/something.test.js  # ❌ If you're not Session A
```

### ✅ Always Do This
```bash
# Work in your assigned directory
mkdir -p myassigned/directory
edit myassigned/directory/myfile.js  # ✅ CORRECT

# Create new files instead of modifying existing
edit src/lib/NewFeature.js  # ✅ CORRECT
```

## Git Workflow

### Starting Your Work
```bash
# 1. Update your local main
git checkout main
git pull origin main

# 2. Create your feature branch
git checkout -b feature/your-task-name

# 3. Work on your files
# ... make changes ...

# 4. Commit frequently
git add .
git commit -m "feat(area): description"

# 5. Push to your branch
git push origin feature/your-task-name
```

### Commit Message Format
```
type(scope): description

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- test: Testing
- refactor: Code refactoring
- ci: CI/CD changes
- chore: Maintenance
```

## Monitoring Progress

### Check Overall Status
```bash
cat STATUS.md
```

### Check Requests
```bash
cat REQUESTS.md | grep "Status: Open"
```

### Update Your Progress
Edit `STATUS.md` and update your task status:
- `Not Started` → `In Progress` → `Review` → `Complete`

## Getting Help

1. **Technical Questions**: Add to `QUESTIONS.md`
2. **Need Something**: Add to `REQUESTS.md`
3. **Found a Conflict**: Stop work, document in `STATUS.md`
4. **Blocked**: Update task status in `STATUS.md`

## Ready to Start?

1. Pick your session (A-E)
2. Update `STATUS.md` with your choice
3. Create your branch
4. Start coding!
5. Have fun improving HostSwitch! 🚀

---

Remember: Communication is key to successful parallel development!