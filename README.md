# Email Workbench — MJML structure → Handlebars content

**One‑liner:** Author emails in **MJML** (structure + partials via `<mj-include>`). Compile **MJML → HTML** first, then run **Handlebars** on the HTML to inject data (variables, loops, conditionals). This yields robust, Outlook‑friendly code while keeping merge logic simple.

---

## Table of contents
- [Why this approach](#why-this-approach)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Authoring guidelines](#authoring-guidelines)
  - [Templates & partials](#templates--partials)
  - [Handlebars with MJML](#handlebars-with-mjml)
  - [Data fixtures](#data-fixtures)
  - [Naming](#naming)
  - [Images](#images)
  - [Accessibility](#accessibility)
- [Subjects (dynamic)](#subjects-dynamic)
- [Build outputs](#build-outputs)
- [Sending tests](#sending-tests)
- [Handover & merge tags](#handover--merge-tags)
- [Troubleshooting](#troubleshooting)
- [For LLM collaborators](#for-llm-collaborators)
- [Roadmap ideas](#roadmap-ideas)
- [Licence](#licence)

---

## Why this approach
- **MJML owns structure:** Compose sections/columns once, include shared blocks with `<mj-include>`, and let MJML emit hybrid table HTML with MSO (Outlook) conditionals and inlined CSS.
- **Handlebars owns content:** After MJML produces valid HTML, Handlebars fills in copy and data. This avoids the MJML parser “eating” moustache syntax and keeps layout concerns separate from data concerns.

> Pipeline: **MJML → HTML → Handlebars** (not the other way around).

---

## Project structure
```
src/
  templates/                 # Top-level MJML templates (use <mj-include> for structure)
  partials/                  # Reusable MJML fragments (header, footer, vehicle-card, etc.)
  subjects/                  # Optional: <name>.subject.hbs for dynamic subject lines
data/                        # JSON fixtures, one or more per template
public/                      # Local images for dev (served at http://localhost:4000)
dist/                        # Compiled outputs (HTML + subject text)
scripts/                     # build / watch / static / send scripts
package.json
README.md
```

---

## Prerequisites
- **Node 18+**
- **Mailpit** for local SMTP testing (UI on `http://localhost:8025`, SMTP on `:1025`). Install with Homebrew or Docker.

---

## Quick start
```bash
npm i
npm run dev               # static server (http://localhost:4000) + auto-rebuild on change

# In another terminal, start Mailpit
#   brew install mailpit && mailpit
#   # or
#   docker run --rm -p 1025:1025 -p 8025:8025 axllent/mailpit

npm run build             # compile templates + data fixtures to dist/
npm run send -- --to your.email@domain.com
```
`npm run send` will **auto-pick a sibling subject** file if present (see [Subjects](#subjects-dynamic)). Use `--subject` or `--subject-file` to override.

---

## Authoring guidelines

### Templates & partials
- **Templates** (`src/templates/*.mjml`):
  - Compose structure and include partials:
    ```xml
    <mj-include path="../partials/header.mjml" />
    ```
  - Use **inline variables** safely anywhere: `{{headline}}`, `{{cta.url}}`, `{{brand.logoUrl}}`.
  - Wrap **block tags** (e.g., `{{#if}}`, `{{#each}}`) in `<mj-raw>` so MJML ignores them:
    ```xml
    <mj-raw>{{#each vehicles}}</mj-raw>
      <mj-include path="../partials/vehicle-card.mjml" />
    <mj-raw>{{/each}}</mj-raw>
    ```

- **Partials** (`src/partials/*.mjml`):
  - Keep them as MJML fragments with data placeholders only. Do not use `{{> … }}`; includes are driven by `<mj-include>` from templates.

### Handlebars with MJML
- Control statements **must** be wrapped in `<mj-raw>` to survive the MJML phase.
- Keep logic minimal and presentational (e.g., showing/hiding blocks). If a property may be an empty object, guard on a specific key:
  ```xml
  <mj-raw>{{#if deal.tradeIn.make}}</mj-raw>
    …details…
  <mj-raw>{{else}}</mj-raw>
    <mj-text><em>No trade-in</em></mj-text>
  <mj-raw>{{/if}}</mj-raw>
  ```
- Helpers like `eq` are pre-registered in `scripts/build.js`. Add more as needed.

### Data fixtures
- Files live in `data/` and pair by name:  
  `src/templates/price-drop.mjml` ↔ `data/price-drop.example.json` → `dist/price-drop.example.html`.
- Add variants as `price-drop.qa.json`, `price-drop.prod.json`, etc.
- Keep secrets out of fixtures; use representative fake values.

### Naming
- Templates/partials: `kebab-case.mjml`  
- Fixtures: `<template>.<variant>.json`  
- Output: `<template>.<variant>.html` (+ optional tokenised output if enabled)

### Images
- During dev: serve from `public/` at `http://localhost:4000/...`.
- Production: **absolute URLs** (CDN/app domain). Email clients won’t resolve relative paths.
- Provide meaningful `alt` text; prefer modest file sizes.

### Accessibility
- Base text ≈16px, good colour contrast, meaningful button labels.
- Set a preheader using `<mj-preview>`; you can add an optional hidden preheader block too.

---

## Subjects (dynamic)
Two supported patterns (use either, or both):

### A) Subject template file (recommended)
Create `src/subjects/<template>.subject.hbs`, e.g.:
```hbs
[{{brand.name}}] Price drop: {{vehicles.0.name}} for {{customer.firstName}}
```
On build you’ll get:
- **Preview:** `dist/<template>.<variant>.subject.txt` (merged with JSON)
- **Tokenised (if enabled):** `dist/<template>.subject.tokens.txt` (keeps `{{...}}`)

The `send` script **auto-detects** `dist/<name>.<variant>.subject.txt` next to the HTML you pass. Override with `--subject` or `--subject-file`.

### B) Subject in data
Add `"subject": "Welcome, {{customer.firstName}}"` to your JSON and emit it in the build if you prefer subjects co-located with data.

---

## Build outputs
By default you’ll have **preview (merged)** HTML for every data fixture:
```
dist/<template>.<variant>.html
dist/<template>.<variant>.subject.txt
```

If you enable tokenised output (see roadmap), you also get:
```
dist/<template>.tokens.html
dist/<template>.subject.tokens.txt
```
Tokenised outputs leave all Handlebars tags intact (e.g., `{{customer.firstName}}`, `{{#each vehicles}}…`) for your app/ESP to merge at send time.

---

## Sending tests
Send any compiled HTML to a local SMTP sink (Mailpit by default):
```bash
npm run send -- --file dist/price-drop.example.html --to your.email@domain.com
```
Options:
- `--subject "My subject"` — use a literal subject
- `--subject-file dist/price-drop.example.subject.txt` — load from file
- `--host`, `--port`, `--from` — SMTP overrides (default is Mailpit `localhost:1025`)

---

## Handover & merge tags
Default tokens are **Handlebars with dot paths** (e.g., `{{customer.firstName}}`). Ask the downstream team if that’s supported. If not, either:
- Map tokens at send time (preferred), or
- Post-process the tokenised HTML using a simple mapping (e.g., `customer.firstName` → `{{FIRST_NAME}}`).

A short Slack message to confirm token format:
> “Quick one: can our email merge handle Handlebars **dot paths** (e.g., `{{customer.firstName}}`, `{{cta.url}}`)? If not, what token format should I use?”

---

## Troubleshooting
- **Else block showing when it shouldn’t**  
  Wrap control statements in `<mj-raw>`. Example trade‑in fix:
  ```hbs
  <mj-raw>{{#if deal.tradeIn}}</mj-raw>
    …trade‑in details…
  <mj-raw>{{else}}</mj-raw>
    <mj-text><em>No trade-in</mj-text>
  <mj-raw>{{/if}}</mj-raw>
  ```
- **Includes not resolving**  
  Ensure `mjml2html` is called with `{ filePath: templatePath }` in `build.js`.
- **Images not loading**  
  Use absolute URLs and confirm the static server/CDN is reachable.
- **Stale output**  
  Use `npm run dev` (watcher) or add a `presend` hook so `npm run send` rebuilds first.

---

## For LLM collaborators
- Do **not** change the pipeline order (must remain MJML → Handlebars).
- Always wrap block tags in `<mj-raw>`.
- Keep logic minimal; avoid adding new dependencies without approval.
- Follow naming conventions and update/add a matching fixture for any new template.
- Prefer small, well‑scoped changes with clear commit messages.

---

## Roadmap ideas
- “Both outputs” build (preview **and** tokenised) in one command.
- Linter for common email pitfalls (missing `alt`, missing preheader).
- CI to build on PRs and attach `dist/` artefacts.
- Token remapper driven by a `mappings.json` (e.g., `customer.firstName` → `{{FIRST_NAME}}`).

---

## Licence
Internal use at CarExpert (or adapt as appropriate).
