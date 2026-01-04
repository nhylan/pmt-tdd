# PM-TDD: Product Manager Test-Driven Development

A prototype framework that lets **Product Managers write and run acceptance tests** without code.

## Core Assumption

**Both PMs and Engineers are working with AI pair programmers.**

This changes everything:

| Traditional | AI-Augmented |
|-------------|--------------|
| PM writes spec → Engineer reads it → Engineer codes | PM writes spec → Engineer's AI reads it → AI proposes code |
| Human translation at every step | **The spec IS the prompt** |

The YAML spec format is designed to be:
1. **Human-readable** — PMs can write and understand it
2. **Machine-readable** — AI coding assistants can parse and implement from it

When an engineer picks up a failing spec, they can tell their AI:
> "Make this spec pass: `specs/password-reset.spec.yaml`"

The AI reads the YAML, understands what needs to exist, and generates the implementation. The spec becomes executable requirements that both humans and machines can act on.

## The Concept

```
PM writes YAML spec → Runs it → ❌ Fails (feature doesn't exist)
                                    ↓
                    Engineer's AI reads spec
                                    ↓
                    AI proposes implementation
                                    ↓
                    Engineer reviews/refines
                                    ↓
                    PM runs spec → ✅ Passes → Ship it
```

**No Gherkin. No step definitions in code. Just YAML → Playwright.**

## Quick Start

```bash
# Install dependencies
npm install

# Run a passing spec
node run-spec.js specs/example.spec.yaml

# Run a failing spec (feature doesn't exist)
node run-spec.js specs/password-reset.spec.yaml
```

## Writing Specs

Specs are YAML files that describe user-facing behavior:

```yaml
feature: Example Feature
description: What this feature does

scenarios:
  - name: Happy path
    steps:
      - goto: https://example.com
      - click: Some Button
      - fill: { selector: "#email", value: "user@test.com" }
      - assert_visible: Success message
```

## Available Actions

| Action | Usage | Description |
|--------|-------|-------------|
| `goto` | `goto: /login` | Navigate to URL |
| `click` | `click: Button Text` | Click element by text |
| `fill` | `fill: { selector: "#id", value: "text" }` | Fill form field |
| `assert_visible` | `assert_visible: Some Text` | Assert text exists |
| `assert_url` | `assert_url: /dashboard` | Assert URL contains |
| `wait` | `wait: 1000` | Wait milliseconds |

## Composable Steps (Planned)

Define reusable steps in `steps/common.yaml`:

```yaml
login_as:
  parameters: [email]
  steps:
    - goto: /login
    - fill: { selector: "#email", value: "{{email}}" }
    - fill: { selector: "#password", value: "test123" }
    - click: Sign In
```

Use them in specs:

```yaml
steps:
  - use: login_as
    with: { email: "user@test.com" }
  - click: Dashboard
  - assert_visible: Welcome
```

## The Workflow

1. **PM writes spec** for a feature that doesn't exist
2. **PM runs spec** → fails (expected)
3. **PM commits spec** to repo
4. **Engineer picks up** the failing spec as the work item
5. **Engineer builds** until spec passes
6. **Merge** → spec becomes regression test

## Project Structure

```
pmt-tdd/
├── run-spec.js         # YAML → Playwright runner
├── specs/              # Acceptance specs (PM writes these)
│   ├── example.spec.yaml
│   └── password-reset.spec.yaml
└── steps/              # Reusable step definitions
    └── common.yaml
```

## Why This Exists

Traditional BDD (Gherkin/Cucumber):
- PM writes `.feature` files
- **Engineer writes step definitions in code**
- PM can't run tests without engineering

This approach:
- PM writes YAML specs
- **Step library is also YAML** (no code)
- **PM can run tests directly**

The PM owns the spec end-to-end. No handoff to engineering for glue code.

## Status

🚧 **Prototype** — Built during exploration of PM-driven acceptance testing.

Features working:
- ✅ Basic actions (goto, click, fill, assert)
- ✅ Scenario execution
- ✅ Pass/fail reporting

Planned:
- ⬜ Composable step library (`use:` keyword)
- ⬜ Screenshots on failure
- ⬜ CI integration
- ⬜ Figma → Spec generation
