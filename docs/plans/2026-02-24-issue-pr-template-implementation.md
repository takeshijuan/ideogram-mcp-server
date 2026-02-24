# Issue & PR Template Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add GitHub issue templates (YAML forms) and a pull request template to enable structured contributor workflows for the Ideogram MCP Server OSS project.

**Architecture:** Static YAML form files for issue templates (`.github/ISSUE_TEMPLATE/*.yml`) and a Markdown PR template (`.github/pull_request_template.md`). No code changes required — only new files under `.github/`.

**Tech Stack:** GitHub Issue Forms (YAML), GitHub Flavored Markdown

---

### Task 1: Create Bug Report Issue Template

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`

**Step 1: Create the bug report template file**

```yaml
name: Bug Report
description: Report a bug or unexpected behavior with the Ideogram MCP Server
title: "[Bug]: "
labels: ["bug"]
body:
  - type: checkboxes
    id: prerequisites
    attributes:
      label: Prerequisites
      options:
        - label: I am using the latest version of `@takeshijuan/ideogram-mcp-server`
          required: true
        - label: I have searched existing issues to avoid duplicates
          required: true

  - type: textarea
    id: description
    attributes:
      label: Bug Description
      description: A clear and concise description of the bug.
      placeholder: Describe what happened...
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: Steps to Reproduce
      description: Minimal steps to reproduce the behavior.
      placeholder: |
        1. Configure the server with...
        2. Send a prompt to generate...
        3. Observe the error...
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What you expected to happen.
      placeholder: Describe what should have happened...
    validations:
      required: true

  - type: dropdown
    id: mcp-client
    attributes:
      label: MCP Client
      description: Which MCP client are you using?
      options:
        - Claude Desktop
        - Cursor
        - VS Code (Copilot)
        - Other (specify in additional context)
    validations:
      required: true

  - type: input
    id: server-version
    attributes:
      label: Server Version
      description: "Version of @takeshijuan/ideogram-mcp-server (run: npm list @takeshijuan/ideogram-mcp-server)"
      placeholder: "e.g., 2.1.0"
    validations:
      required: true

  - type: input
    id: node-version
    attributes:
      label: Node.js Version
      description: "Run: node --version"
      placeholder: "e.g., v20.11.0"
    validations:
      required: true

  - type: dropdown
    id: os
    attributes:
      label: Operating System
      options:
        - macOS
        - Windows
        - Linux
    validations:
      required: true

  - type: textarea
    id: config
    attributes:
      label: Server Configuration
      description: |
        Relevant section from your MCP client config (e.g., `claude_desktop_config.json`).
        **IMPORTANT: Remove your API key before pasting!**
      render: json
    validations:
      required: false

  - type: textarea
    id: logs
    attributes:
      label: Logs
      description: Any relevant log output or error messages.
      render: shell
    validations:
      required: false

  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: Any other context, screenshots, or information about the problem.
    validations:
      required: false
```

**Step 2: Verify YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/ISSUE_TEMPLATE/bug_report.yml'))"`
Expected: No output (no errors)

**Step 3: Commit**

```bash
git add .github/ISSUE_TEMPLATE/bug_report.yml
git commit -m "add: bug report issue template with YAML forms"
```

---

### Task 2: Create Feature Request Issue Template

**Files:**
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`

**Step 1: Create the feature request template file**

```yaml
name: Feature Request
description: Suggest a new feature or enhancement for the Ideogram MCP Server
title: "[Feature]: "
labels: ["enhancement"]
body:
  - type: checkboxes
    id: prerequisites
    attributes:
      label: Prerequisites
      options:
        - label: I have searched existing issues and feature requests to avoid duplicates
          required: true

  - type: textarea
    id: description
    attributes:
      label: Feature Description
      description: A clear and concise description of the feature you'd like.
      placeholder: Describe the feature...
    validations:
      required: true

  - type: textarea
    id: use-case
    attributes:
      label: Use Case
      description: Why do you need this feature? What problem does it solve?
      placeholder: Explain the use case and motivation...
    validations:
      required: true

  - type: textarea
    id: proposed-solution
    attributes:
      label: Proposed Solution
      description: How do you envision this feature working?
      placeholder: Describe your proposed solution...
    validations:
      required: false

  - type: textarea
    id: example-prompts
    attributes:
      label: Example Prompts
      description: |
        If this feature involves MCP tools, provide example prompts showing how you'd
        use it with an LLM (e.g., Claude Desktop).
      placeholder: |
        Example: "Generate an image of a sunset using the new style preset 'watercolor'"
    validations:
      required: false

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: Any alternative solutions or workarounds you've considered.
    validations:
      required: false

  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: Any other context, mockups, or references for the feature request.
    validations:
      required: false
```

**Step 2: Verify YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/ISSUE_TEMPLATE/feature_request.yml'))"`
Expected: No output (no errors)

**Step 3: Commit**

```bash
git add .github/ISSUE_TEMPLATE/feature_request.yml
git commit -m "add: feature request issue template with YAML forms"
```

---

### Task 3: Create Question Issue Template

**Files:**
- Create: `.github/ISSUE_TEMPLATE/question.yml`

**Step 1: Create the question template file**

```yaml
name: Question
description: Ask a question about using or configuring the Ideogram MCP Server
title: "[Question]: "
labels: ["question"]
body:
  - type: textarea
    id: question
    attributes:
      label: Question
      description: What would you like to know?
      placeholder: Ask your question here...
    validations:
      required: true

  - type: textarea
    id: environment
    attributes:
      label: Environment Info
      description: |
        If relevant, provide your environment details:
        - Server version
        - Node.js version
        - MCP client (Claude Desktop, Cursor, VS Code, etc.)
        - OS
      placeholder: |
        - Server version: 2.1.0
        - Node.js: v20.11.0
        - MCP client: Claude Desktop
        - OS: macOS
    validations:
      required: false

  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: Any other context that might help answer your question.
    validations:
      required: false
```

**Step 2: Verify YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/ISSUE_TEMPLATE/question.yml'))"`
Expected: No output (no errors)

**Step 3: Commit**

```bash
git add .github/ISSUE_TEMPLATE/question.yml
git commit -m "add: question issue template with YAML forms"
```

---

### Task 4: Create Issue Template Config

**Files:**
- Create: `.github/ISSUE_TEMPLATE/config.yml`

**Step 1: Create the config file**

```yaml
blank_issues_enabled: false
contact_links:
  - name: MCP Protocol Documentation
    url: https://modelcontextprotocol.io
    about: Learn about the Model Context Protocol
  - name: Ideogram API Documentation
    url: https://developer.ideogram.ai
    about: Read the Ideogram API documentation
  - name: Quick Start Guide
    url: https://github.com/takeshijuan/ideogram-mcp-server/blob/main/docs/QUICKSTART.md
    about: Get started with the Ideogram MCP Server
```

**Step 2: Verify YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/ISSUE_TEMPLATE/config.yml'))"`
Expected: No output (no errors)

**Step 3: Commit**

```bash
git add .github/ISSUE_TEMPLATE/config.yml
git commit -m "add: issue template config to enforce template usage"
```

---

### Task 5: Create Pull Request Template

**Files:**
- Create: `.github/pull_request_template.md`

**Step 1: Create the PR template file**

```markdown
## Summary

<!-- Provide a brief description of the changes in 1-2 sentences. -->

## Related Issue

<!-- Link related issues using "Fixes #123" or "Relates to #123". -->

Fixes #

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Chore (build, CI, dependencies, etc.)

## What Changed

<!-- List the specific changes made in this PR. -->

-
-
-

## MCP Impact

<!-- Check all that apply. This helps reviewers understand the scope of changes. -->

- [ ] Modifies existing tool schema (input parameters or response format)
- [ ] Adds a new MCP tool
- [ ] Changes tool behavior (same schema, different behavior)
- [ ] No impact on MCP tools

## Tested Prompts

<!-- If this PR modifies or adds MCP tools, provide example prompts you used for testing.
     Delete this section if not applicable. -->

```
Example: "Generate an image of a mountain landscape in 16:9 aspect ratio"
```

## Checklist

- [ ] My code follows the project's coding standards (ESLint + Prettier)
- [ ] I have run `npm run typecheck` with no errors
- [ ] I have run `npm run lint` with no errors
- [ ] I have added/updated tests for my changes
- [ ] I have run `npm run test:run` and all tests pass
- [ ] I have updated documentation if needed
- [ ] I have not included any API keys, secrets, or credentials
- [ ] My changes do not introduce security vulnerabilities
```

**Step 2: Commit**

```bash
git add .github/pull_request_template.md
git commit -m "add: pull request template with MCP-specific sections"
```

---

### Task 6: Final Verification

**Step 1: Verify all files are in place**

Run: `find .github -type f | sort`
Expected:
```
.github/ISSUE_TEMPLATE/bug_report.yml
.github/ISSUE_TEMPLATE/config.yml
.github/ISSUE_TEMPLATE/feature_request.yml
.github/ISSUE_TEMPLATE/question.yml
.github/pull_request_template.md
.github/workflows/publish.yml
```

**Step 2: Verify all YAML files parse correctly**

Run: `for f in .github/ISSUE_TEMPLATE/*.yml; do python3 -c "import yaml; yaml.safe_load(open('$f'))" && echo "OK: $f"; done`
Expected: All files report OK

**Step 3: Verify no sensitive data in templates**

Run: `grep -ri "api.key\|secret\|password\|token" .github/ISSUE_TEMPLATE/ .github/pull_request_template.md`
Expected: Only the warning about removing API keys (in bug_report.yml) — no actual secrets
