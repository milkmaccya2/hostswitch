# Security Policy

HostSwitch modifies the system hosts file and, on most platforms, needs to
re-run itself with `sudo`/administrator privileges to do so. Because of that,
we treat security reports for this project seriously and ask that they be
reported privately rather than filed as public issues.

## Supported Versions

Only the latest version published on npm is supported with security fixes.
Please make sure you can reproduce the issue on the latest release
(`hostswitch --version`) before reporting.

## Reporting a Vulnerability

Please report security vulnerabilities using
[GitHub Private Vulnerability Reporting](https://github.com/milkmaccya2/hostswitch/security/advisories/new)
rather than a public issue, pull request, or discussion.

When reporting, please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce, including OS, Node.js version, and hostswitch version
- Whether the issue requires sudo/administrator privileges to trigger

We aim to acknowledge new reports within **5 business days** and to provide
a fix or mitigation plan within **30 days**, depending on severity and
complexity. We'll keep you updated as we investigate.

## Scope

**In scope** — issues where hostswitch itself is the source of the risk:

- A non-privileged user being able to escalate privileges through
  hostswitch (e.g. abusing the sudo re-run flow, editor invocation, or
  profile file handling)
- hostswitch writing to, or reading from, unintended file paths while
  running with elevated privileges
- Profile name/content handling that allows path traversal, command
  injection, or arbitrary file writes
- Backup or checksum logic that could silently corrupt or lose the system
  hosts file

**Out of scope**:

- The local user intentionally editing their own hosts file, profiles, or
  hostswitch configuration — hostswitch is a tool the user runs with their
  own privileges, and actions taken deliberately by that user against their
  own machine are not a vulnerability in hostswitch
- Social engineering or physical access attacks
- Issues that require an already-compromised machine or an already-malicious
  local actor with equal or greater privileges than hostswitch itself

If you're unsure whether something is in scope, please report it anyway —
we'd rather triage a borderline report than miss a real issue.
