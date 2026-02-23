# Issue & PR Template Design

## Overview

Add GitHub issue templates (YAML forms) and a pull request template to the Ideogram MCP Server project, following OSS best practices for MCP server projects.

## Approach

**YAML Forms for Issues** (same approach as `modelcontextprotocol/python-sdk`):
- Structured input with dropdowns, checkboxes, and required field validation
- `blank_issues_enabled: false` to enforce template usage

**Markdown for PR Template** (GitHub standard):
- MCP-specific sections (tool schema impact, tested prompts)
- Inspired by `github/github-mcp-server` PR template

## File Structure

```
.github/
├── ISSUE_TEMPLATE/
│   ├── bug_report.yml
│   ├── feature_request.yml
│   ├── question.yml
│   └── config.yml
└── pull_request_template.md
```

## Template Designs

### Bug Report (`bug_report.yml`)

| Field | Type | Required | Notes |
|---|---|---|---|
| Prerequisites | checkboxes | Yes | Latest version, searched existing issues |
| Bug description | textarea | Yes | |
| Steps to reproduce | textarea | Yes | |
| Expected behavior | textarea | Yes | |
| MCP Client | dropdown | Yes | Claude Desktop / Cursor / VS Code / Other |
| Server version | input | Yes | |
| Node.js version | input | Yes | |
| OS | dropdown | Yes | macOS / Windows / Linux |
| Server configuration | textarea | No | Redacted `claude_desktop_config.json` |
| Logs | textarea | No | `render: shell` |
| Additional context | textarea | No | |

### Feature Request (`feature_request.yml`)

| Field | Type | Required | Notes |
|---|---|---|---|
| Prerequisites | checkboxes | Yes | Searched existing issues/features |
| Feature description | textarea | Yes | |
| Use case | textarea | Yes | |
| Proposed solution | textarea | No | |
| Example prompts | textarea | No | MCP-specific: how to use with LLM |
| Alternatives considered | textarea | No | |
| Additional context | textarea | No | |

### Question (`question.yml`)

| Field | Type | Required | Notes |
|---|---|---|---|
| Question | textarea | Yes | |
| Environment info | textarea | No | |
| Additional context | textarea | No | |

### Config (`config.yml`)

- `blank_issues_enabled: false`
- Contact links: MCP Protocol docs, Ideogram API docs

### PR Template (`pull_request_template.md`)

| Section | Description |
|---|---|
| Summary | 1-2 sentence overview |
| Related Issue | `Fixes #` format |
| Type of change | Checkboxes: Bug fix / New feature / Breaking change / Documentation / Refactoring |
| What changed | Bullet list of changes |
| MCP Impact | Checkboxes: Tool schema change / New tool / Tool behavior change / No impact |
| Tested prompts | Example prompts used for testing (when tool changes are involved) |
| Checklist | Tests, lint, docs, security, no API keys |

## References

- `modelcontextprotocol/python-sdk` - YAML form issue templates
- `github/github-mcp-server` - MCP-specific PR template sections
- `modelcontextprotocol/servers` - PR template
- GitHub Docs - Syntax for issue forms
