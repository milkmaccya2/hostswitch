# Security Policy

HostSwitch modifies the system hosts file, so security reports are handled with priority.

## Supported versions

Only the latest published version is supported. Please upgrade before reporting a vulnerability.

## Reporting a vulnerability

Do not open a public issue for a security vulnerability. Use **GitHub Private Vulnerability Reporting** on this repository:

https://github.com/milkmaccya2/hostswitch/security/policy

If Private Vulnerability Reporting is not enabled yet, ask a maintainer to enable it in **Settings -> Security -> Private vulnerability reporting**.

Please include:

- HostSwitch version (`hostswitch --version`)
- Operating system and version
- Installation method (npm global, npm link, or source)
- The command that triggered the issue and whether sudo/admin was used
- A minimal reproduction when possible
- Impact and any suggested mitigation

## Scope

In scope:

- Privilege escalation through HostSwitch by an unprivileged user
- Unexpected file writes as root/sudo caused by HostSwitch
- Command injection, path traversal, or unsafe handling of profile data
- Issues in the auto-sudo or permission-checking flow

Out of scope:

- A local user intentionally using HostSwitch with their own privileges
- Security issues in third-party dependencies that have already been fixed upstream

## Response

The maintainers aim to acknowledge reports within 3 business days and will coordinate disclosure through GitHub's private reporting workflow.
