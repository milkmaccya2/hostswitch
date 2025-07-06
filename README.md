# HostSwitch

[![npm version](https://badge.fury.io/js/@milkmaccya2%2Fhostswitch.svg)](https://www.npmjs.com/package/@milkmaccya2/hostswitch)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A simple CLI tool for switching hosts file profiles

[日本語](README.ja.md)

## Overview

HostSwitch is a CLI tool that makes it easy to switch between different hosts configurations for development and testing environments. Unlike GUI applications like Gas Mask, it focuses on quick command-line operations.

### Perfect for

- 👨‍💻 Web developers working with multiple development environments
- 🔧 Engineers who need to test across local, staging, and production
- 🏢 System administrators managing multiple server environments
- 🚀 Anyone who prefers fast CLI operations

## Key Features

- ✅ **Multiple hosts profile management** - For development, staging, production, etc.
- 💾 **Automatic backup** - Saves current hosts before switching
- 🎨 **Colorful output** - Clear status visibility
- ⚡ **Simple CLI** - Easy-to-remember commands
- 🔒 **Safe operations** - Explicit sudo requirements

## Requirements

- Node.js 20.0.0 or higher
- macOS / Linux / Windows (WSL recommended)
- sudo permissions (for hosts file switching)

## Installation

### Install from npm (Recommended)
```bash
# Global installation
npm install -g @milkmaccya2/hostswitch

# Or run directly with npx
npx @milkmaccya2/hostswitch list
```

### Install from source
```bash
# Clone repository
git clone https://github.com/milkmaccya2/hostswitch.git
cd hostswitch

# Install dependencies
npm install

# Global installation (optional)
npm link
```

## Usage

### List profiles
```bash
hostswitch list
# or
hostswitch ls
```

### Create a profile
```bash
# Create with default content
hostswitch create development

# Create from current hosts file
hostswitch create production --from-current
```

### Switch profile (requires sudo)
```bash
sudo hostswitch switch development
# or
sudo hostswitch use development
```

### Show profile contents
```bash
hostswitch show development
# or
hostswitch cat development
```

### Edit a profile
```bash
hostswitch edit development
```

### Delete a profile
```bash
hostswitch delete development
# or
hostswitch rm development
```

## Common Use Cases

### Development Environment Setup

```bash
# For local development
hostswitch create local
hostswitch edit local
# 127.0.0.1 api.myapp.local
# 127.0.0.1 app.myapp.local

# For Docker environment
hostswitch create docker
hostswitch edit docker
# 172.17.0.2 api.myapp.docker
# 172.17.0.3 db.myapp.docker

# Switch between them
sudo hostswitch switch local
```

### Team Development

```bash
# Reference team member's environment
hostswitch create team-dev --from-current

# Switch back to your environment
sudo hostswitch switch local
```

### Production Testing

```bash
# Create hosts pointing to production
hostswitch create production
hostswitch edit production
# 192.168.1.100 api.myapp.com
# 192.168.1.101 app.myapp.com

# Run tests
sudo hostswitch switch production
# After testing
sudo hostswitch switch local
```

## Troubleshooting

### Why sudo is required

The `/etc/hosts` file is a system file owned by root, so administrative privileges are required to modify it.

```bash
# ✅ Correct usage
sudo hostswitch switch dev

# ❌ Will error
hostswitch switch dev  # Permission denied
```

### Profile not found

```bash
# Check profile list
hostswitch list

# Check for typos
hostswitch show <tab>  # if bash completion is available
```

### Windows Usage

For Windows, we recommend using WSL (Windows Subsystem for Linux). If using native Windows, run Command Prompt as Administrator.

## Data Storage

- Profiles: `~/.hostswitch/profiles/`
- Backups: `~/.hostswitch/backups/`
- Current profile info: `~/.hostswitch/current.json`

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Author

[milkmaccya2](https://github.com/milkmaccya2)

## Contributing

Bug reports and feature requests are welcome at [GitHub Issues](https://github.com/milkmaccya2/hostswitch/issues).