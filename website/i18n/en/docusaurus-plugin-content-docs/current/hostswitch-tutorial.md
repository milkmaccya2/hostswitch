---
sidebar_position: 2
---

# HostSwitch Tutorial

HostSwitch is a CLI tool for easily switching hosts settings in development and test environments.
This tutorial covers everything from installing HostSwitch to basic usage and practical scenarios.

## 1. Installation

First, let's install HostSwitch. Node.js (v20.0.0 or higher) is required.

### Installation via npm (Recommended)

```bash
npm install -g @milkmaccya2/hostswitch
```

Alternatively, you can run it directly with `npx` without installing.

```bash
npx @milkmaccya2/hostswitch list
```

## 2. Basic Usage

HostSwitch has two modes: Interactive Mode and Command Line Argument Mode.

### Interactive Mode

Running `hostswitch` without arguments starts the interactive mode. You can navigate with arrow keys, so there's no need to memorize commands.

```bash
hostswitch
```

Follow the screen to "Switch profile", "List", "Create", "Edit", or "Delete".

### Command Line Operations

For scripts or those who prefer CLI, command line arguments are available.

#### List Profiles

```bash
hostswitch list
```

#### Create Profile

Create a new profile.

```bash
# Create an empty profile
hostswitch create development

# Create from current hosts file content
hostswitch create production --from-current
```

#### Edit Profile

Edit the created profile with an editor.

```bash
hostswitch edit development
```

#### Switch Profile

Switch hosts to the created profile. Default sudo privileges will be requested automatically if needed.

```bash
hostswitch switch development
```

## 3. Practical Scenarios

Here are examples of using HostSwitch in a development flow.

### Scenario A: Switching between Local Dev and Production

In Web development, it's common to switch between a local server (localhost) and a production server.

1.  **Create Local Profile**
    ```bash
    hostswitch create local
    hostswitch edit local
    ```
    Content:
    ```
    127.0.0.1 api.myapp.com
    127.0.0.1 app.myapp.com
    ```

2.  **Create Production Profile**
    ```bash
    hostswitch create production
    hostswitch edit production
    ```
    Content (actual production IP):
    ```
    203.0.113.1 api.myapp.com
    203.0.113.2 app.myapp.com
    ```

3.  **Switch Environment**
    Switch to `local` during development:
    ```bash
    hostswitch switch local
    ```
    
    Switch to `production` when verifying production behavior:
    ```bash
    hostswitch switch production
    ```

### Scenario B: Sharing Settings with Team

If you want to use the same hosts settings as your team members, create a profile once and share its content.

```bash
# Create team common settings
hostswitch create team-env
hostswitch edit team-env
# (Paste shared settings)
```

## Troubleshooting

### Permission Errors
HostSwitch automatically requests sudo privileges, but if it fails, please run with sudo manually.
```bash
sudo hostswitch switch development
```

### For Windows Users
We recommend using WSL (Windows Subsystem for Linux), but it can also be used by running Command Prompt or PowerShell as "Administrator".
