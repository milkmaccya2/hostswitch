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
The application is now designed for testability with dependency injection:
- All external dependencies are abstracted via interfaces
- Core business logic is pure and isolated in `HostSwitchService`
- File system, logging, and process execution can be mocked

Currently, no test framework is configured. The test script returns an error:
```bash
npm test  # Will exit with error - tests not implemented
```

Recommended test setup:
- **Jest** or **Vitest** for unit testing
- Mock implementations of `IFileSystem`, `ILogger`, `IProcessManager`
- Test `HostSwitchService` in isolation
- Integration tests for CLI commands

### Linting
No linting configuration exists. Consider adding ESLint if implementing code style checks.

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
- **HostSwitchService**: Core business logic
  - Profile management (create, delete, list, switch)
  - Checksum tracking for change detection
  - Backup management
  - Platform-agnostic profile operations

#### **CLI Layer** (`cli/`)
- **CommandHandler**: Maps CLI commands to service operations
- **CliApplication**: Commander.js setup and command routing
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