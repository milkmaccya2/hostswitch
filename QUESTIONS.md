# Development Questions

This file tracks questions that arise during parallel development sessions.

## Question Format

```markdown
### Q-YYYY-MM-DD-XXX
**From**: Session/Developer ID
**Topic**: Category (Architecture | Implementation | Testing | Documentation | Other)
**Status**: Open | Answered | Discussing

**Question**:
Your question here

**Context**:
Additional context or code examples

**Answer**:
(Added when answered)

**Answered By**: Session/Developer ID
**Date**: YYYY-MM-DD

---
```

## Open Questions

### Q-2025-06-27-001
**From**: Planning Team
**Topic**: Architecture
**Status**: Open

**Question**:
Should we maintain backward compatibility with the current CLI commands when refactoring to TypeScript/modules?

**Context**:
Current commands: list, create, switch, delete, show, edit
These are well-documented and users may have scripts depending on them.

**Answer**:
(Pending community input)

---

### Q-2025-06-27-002
**From**: Planning Team
**Topic**: Testing
**Status**: Open

**Question**:
What should be our target test coverage percentage for v2.0.0?

**Context**:
Currently there are no tests. Industry standards suggest 80%+ for critical applications.

**Answer**:
(Pending decision)

---

## Answered Questions

(None yet)

## Discussion Topics

### Windows Native Support
- Should we prioritize native Windows support without WSL?
- What are the challenges with Windows hosts file permissions?
- How do other tools handle this?

### Profile Format
- Should we support YAML/JSON profile formats in addition to raw hosts files?
- Would this add unnecessary complexity?

### Backup Strategy
- How many backups should we keep by default?
- Should backups be compressed?
- Should we support remote backup locations?

---

*Add your questions above using the specified format*