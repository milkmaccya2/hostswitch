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
Currently, no test framework is configured. The test script returns an error:
```bash
npm test  # Will exit with error - tests not implemented
```

### Linting
No linting configuration exists. Consider adding ESLint if implementing code style checks.

## Architecture

### TypeScript Structure
The application is now written in TypeScript:
- **Source**: `src/hostswitch.ts`
- **Compiled**: `dist/hostswitch.js`
- **Types**: Full TypeScript type safety with strict mode enabled

### Main Components
- **HostSwitch class**: Core business logic
  - Profile management (create, delete, list)
  - Hosts file switching with backup
  - Checksum tracking to detect manual modifications
  - Editor integration for profile editing
- **Commander CLI setup**: Command definitions and routing
- **Cross-platform support**: Automatic detection of Windows/Unix hosts file paths

### Data Storage
All data is stored in `~/.hostswitch/`:
- `profiles/`: Contains `.hosts` files for each profile
- `backups/`: Automatic backups of hosts file before switching
- `current.json`: Tracks current profile and checksum

### Key Methods
- `switchProfile()`: Main functionality - requires sudo/admin to modify hosts file
- `isHostsModified()`: Detects if hosts file was changed outside of hostswitch
- `backupHosts()`: Creates timestamped backups before switching
- `getCurrentProfile()`: Returns the currently active profile
- `createProfile()`: Creates new profile with optional content from current hosts

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