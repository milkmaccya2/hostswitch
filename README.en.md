# HostSwitch

[![npm version](https://badge.fury.io/js/@milkmaccya2%2Fhostswitch.svg)](https://www.npmjs.com/package/@milkmaccya2/hostswitch)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A simple CLI tool to switch between multiple hosts file profiles

[日本語版](README.md)

## Overview

HostSwitch is a CLI tool that allows you to easily switch between different hosts configurations for development and testing environments. Unlike GUI applications like Gas Mask, it focuses on quick command-line operations.

### Who is this for?

- 👨‍💻 Web developers who need to switch between multiple development environments
- 🔧 Engineers who need to test local, staging, and production environments
- 🏢 System administrators managing multiple server environments
- 🚀 Anyone who prefers fast CLI operations

## Features

- ✅ **Multiple hosts profile management** - for development, staging, production, etc.
- 💾 **Automatic backup** - saves current hosts before switching
- 🎨 **Colorful output** - easy to understand status at a glance
- ⚡ **Simple CLI** - easy to remember commands
- 🔒 **Safe operations** - clearly indicates when sudo is required

## Requirements

- Node.js 14.0.0 or higher
- macOS / Linux / Windows (WSL recommended)
- sudo privileges (for switching hosts files)

## Installation

### Install from npm (Recommended)
```bash
# Global installation
npm install -g @milkmaccya2/hostswitch

# Or use with npx
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

### Show profile content
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

# Switch between environments
sudo hostswitch switch local
```

### Team Development

```bash
# Copy team member's environment
hostswitch create team-dev --from-current

# Switch back to your environment
sudo hostswitch switch local
```

### Production Testing

```bash
# Create production hosts
hostswitch create production
hostswitch edit production
# 192.168.1.100 api.myapp.com
# 192.168.1.101 app.myapp.com

# Test production
sudo hostswitch switch production
# After testing
sudo hostswitch switch local
```

## Troubleshooting

### Why sudo is required

The `/etc/hosts` file is a system file owned by root, so administrator privileges are required to modify it.

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

# Use tab completion if available
hostswitch show <tab>
```

### Windows usage

WSL (Windows Subsystem for Linux) is recommended for Windows. If using native Windows, run Command Prompt as Administrator.

## Data Storage

- Profiles: `~/.hostswitch/profiles/`
- Backups: `~/.hostswitch/backups/`
- Current profile info: `~/.hostswitch/current.json`

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

[milkmaccya2](https://github.com/milkmaccya2)

## Contributing

Bug reports and feature requests are welcome at [GitHub Issues](https://github.com/milkmaccya2/hostswitch/issues).