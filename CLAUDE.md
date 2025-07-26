# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

HostSwitch is a CLI tool for managing and switching between multiple hosts file profiles. It's designed for developers who need to quickly switch between different environment configurations (local, staging, production, etc.).

## Development Commands

### Building and Running the CLI
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev -- [command]

# Run built version
npm start -- [command]

# Watch mode for development
npm run build:watch

# Clean build directory
npm run clean

# Via npm (after global install)
npm link
hostswitch [command]
```

### Testing
The application is designed for comprehensive testability with dependency injection:
- All external dependencies are abstracted via interfaces
- Core business logic is pure and isolated in separate manager classes
- File system, logging, and process execution can be mocked

Test framework:
- **Vitest** for unit testing with coverage reporting
- Mock implementations in `src/__mocks__/`
- Test files in `src/core/__tests__/`

### Test Development Philosophy (t-wada TDD)
Following Takuto Wada's (t-wada) Test-Driven Development principles:

1. **Test First**: Write tests before implementation
2. **Red-Green-Refactor Cycle**:
   - Red: Write a failing test
   - Green: Write minimal code to pass
   - Refactor: Improve code while keeping tests green
3. **Single Responsibility**: Each test should verify one behavior
4. **Test List**: Create a list of test scenarios before coding
5. **Focus on Core Logic**: Test individual components (ProfileManager, CurrentProfileManager, BackupManager) rather than testing everything through HostSwitchService
6. **Minimal Test Overlap**: Avoid testing the same logic through multiple paths

**Applied Implementation:**
- Individual manager classes have comprehensive unit tests covering all functionality
- HostSwitchService tests focus on integration scenarios and coordination logic
- Mock implementations allow isolated testing without file system dependencies
- Error scenarios are thoroughly tested for robust error handling

Test commands:
```bash
npm test               # Run tests in watch mode
npm run test:run       # Run tests once  
npm run test:ui        # Open test UI
npm run test:coverage  # Generate coverage report
```

### Code Quality and Formatting
The project uses **Biome** - a modern, unified linter and formatter.

**Commands:**
```bash
npm run lint          # Check for linting errors
npm run lint:fix      # Auto-fix linting and formatting issues
npm run format        # Format code only
npm run format:check  # Check formatting without fixing
npm run check         # Run linting + formatting + tests (CI)
```

**Configuration:**
- Main config: `biome.json`
- IDE integration: `.vscode/settings.json` (auto-format on save)
- Recommended extension: `biomejs.biome`

**Code Style Rules:**
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for TypeScript/JavaScript
- **Semicolons**: Always required
- **Line width**: 100 characters
- **Import organization**: Alphabetical, with type imports
- **Node.js protocol**: Required for built-in modules (`node:fs`)

## Architecture

### Layered Architecture
The application follows a clean architecture pattern with clear separation of concerns:

```
src/
├── interfaces/           # Type definitions and abstractions
├── core/                # Domain logic (business rules)
├── cli/                 # CLI-specific implementation
├── infrastructure/      # External dependencies implementation
├── config/              # Configuration management
└── hostswitch.ts       # Entry point with dependency injection
```

### Core Components

#### **Domain Layer** (`core/`)
- **HostSwitchService**: Coordinator for business operations
  - Orchestrates ProfileManager, CurrentProfileManager, and BackupManager
  - Handles complex workflows like profile switching
  - Integration and error handling scenarios
- **ProfileManager**: Profile CRUD operations
  - Create, delete, list profiles
  - Profile content management and validation
  - File system error handling
- **CurrentProfileManager**: Current state management
  - Track current profile and checksum
  - Detect hosts file modifications
  - JSON parsing and file validation
- **BackupManager**: Backup functionality
  - Create timestamped backups of hosts file
  - Error resilience and fallback handling

#### **CLI Layer** (`cli/`)
- **HostSwitchFacade**: Simplified interface for all business operations
- **CliController**: Maps CLI commands to facade operations using Command Pattern
- **InteractiveUserInterface**: Interactive mode using inquirer.js for user-friendly prompts
- **CliUserInterface**: Command-line interface for non-interactive operations
- **Command Classes**: Individual command implementations following Command Pattern
  - ListProfilesCommand, CreateProfileCommand, SwitchProfileCommand
  - EditProfileCommand, ShowProfileCommand, DeleteProfileCommand
- Handles user interaction and error reporting

#### **Infrastructure Layer** (`infrastructure/`)
- **FileSystemAdapter**: File system operations implementation
- **ChalkLogger**: Console output with colors and formatting
- **ProcessManager**: External process execution (editor)

#### **Interface Layer** (`interfaces/`)
- **IFileSystem**: File system abstraction for testing
- **ILogger**: Logging abstraction
- **IProcessManager**: Process execution abstraction
- Type definitions for data structures and configurations

### Dependency Injection
The application uses constructor injection for all dependencies:
- Services receive interfaces, not concrete implementations
- Easy to mock for unit testing
- Clear dependency graph in `hostswitch.ts`

### Data Storage
All data is stored in `~/.hostswitch/`:
- `profiles/`: Contains `.hosts` files for each profile
- `backups/`: Automatic backups of hosts file before switching
- `current.json`: Tracks current profile and checksum

### Key Service Methods
- `switchProfile()`: Main functionality - requires sudo/admin to modify hosts file
- `isHostsModified()`: Detects if hosts file was changed outside of hostswitch
- `backupHosts()`: Creates timestamped backups before switching
- `getCurrentProfile()`: Returns the currently active profile
- `createProfile()`: Creates new profile with optional content from current hosts
- `getProfiles()`: Returns list of profiles with current status

### Security Considerations
- Switching profiles requires sudo/admin privileges (modifies system hosts file)
- Automatic backup prevents data loss
- Checksum validation detects external modifications
- Profile name sanitization prevents file system issues

## CLI Commands

All commands are defined using Commander.js:
- `list` / `ls`: Show all profiles
- `create <name> [--from-current]`: Create new profile
- `switch <name>` / `use <name>`: Switch active profile (requires sudo)
- `delete <name>` / `rm <name>`: Remove profile
- `show <name>` / `cat <name>`: Display profile contents
- `edit <name>`: Open profile in editor (uses $EDITOR or vi)

### Interactive Mode
Running `hostswitch` without any arguments launches an interactive mode:
- User-friendly menu navigation using arrow keys
- All major operations available through prompts
- Visual indicators for current profile
- Automatic sudo detection with helpful instructions
- Confirmation prompts for destructive operations
- Implemented using InteractiveUserInterface with inquirer.js

## Important Implementation Details

1. **Hosts File Path**: Automatically detects OS
   - Unix/Linux/macOS: `/etc/hosts`
   - Windows: `C:\Windows\System32\drivers\etc\hosts`
2. **Editor Selection**: Uses `$EDITOR` environment variable, falls back to `vi`
3. **Profile Validation**: Cannot delete currently active profile
4. **Backup Strategy**: Only backs up if hosts file was modified or no current profile exists
5. **TypeScript Configuration**: 
   - Target: ES2022
   - Module: CommonJS
   - Strict mode enabled
   - Source maps included for debugging

## TypeScript Build Process

The project uses TypeScript with the following configuration:
- Source files in `src/`
- Compiled output in `dist/`
- Declaration files generated for type support
- Source maps for debugging
- Strict type checking enabled

Build commands:
- `npm run build`: One-time build
- `npm run build:watch`: Watch mode for development
- `npm run clean`: Clean build directory
- `npm run dev`: Run TypeScript directly without building

## Workflow Reminders

- タスクが終わるごとに@ARCHITECTURE_DIAGRAMS.md を更新する

## Development Workflow

### Task Completion Review
When completing development tasks, always review the following:
1. **Code quality**: `npm run lint:fix` (auto-fix linting and formatting)
2. **Comprehensive tests**: `npm run test:run`
3. **Test coverage**: `npm run test:coverage`
4. **Type checking**: `npm run build`
5. **Full quality check**: `npm run check` (combines linting, formatting, and tests)
6. **Manual CLI testing**: Test core functionality manually
7. **Documentation updates**: Update relevant documentation files
8. **Architecture consistency**: Review adherence to clean patterns

**Recommended pre-commit workflow:**
```bash
npm run check  # Ensures all quality gates pass
```