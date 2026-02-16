# Email Workbench (MJML-First)

## Overview
Email template system using MJML for structure/layout and Handlebars for dynamic content.
Pipeline: MJML → HTML → Handlebars.

## Product context
These templates are email notifications for **CarExpert Exchange** — a portal used by:
- **Brokers** (CarExpert's "New Car Specialists") who facilitate deals
- **Car dealers** who fulfil new car orders
- **Customers** who are buying new cars

Deals are always for **new cars** but may include **trade-ins** (handled by the dealer or a wholesaler trade partner).

Templates fall into two categories with different branding:
- **Dealer-facing** — uses `header.mjml` partial, notifies dealers about deals, quotes, reminders
- **Customer-facing** — uses `header-customer.mjml` partial, notifies customers about their purchase progress

## Commands
- `npm run dev` — starts static server (port 4000) + file watcher
- `npm run build` — compile all templates
- `npm run send -- --file dist/<name>.html --to <email>` — send single email via SMTP
- `npm run send:all -- --to <email>` — send all emails
- `npm run clean` — wipe dist/

## Directory structure
- `src/templates/` — MJML email templates (entry points)
- `src/partials/` — reusable MJML fragments (included via `<mj-include>`)
- `src/subjects/` — Handlebars subject line templates
- `data/` — JSON fixture files (one per template variant)
- `dist/` — compiled output (HTML + subject TXT)
- `public/` — dev preview UI + static assets
- `scripts/` — build, watch, send, preview tooling

## Critical rules

### Handlebars block tags MUST be wrapped in `<mj-raw>`
MJML will consume/break Handlebars block syntax. Always wrap `{{#if}}`, `{{#each}}`, `{{else}}`, `{{/if}}`, `{{/each}}` in `<mj-raw>`:
```xml
<mj-raw>{{#if someCondition}}</mj-raw>
  <mj-text>Conditional content</mj-text>
<mj-raw>{{/if}}</mj-raw>
```
Inline variables like `{{dealer.firstName}}` do NOT need `<mj-raw>`.

### Use `<mj-include>` for partials, not Handlebars `{{> ...}}`
Partials are composed at the MJML level before Handlebars runs.

## Naming conventions
- Templates: `kebab-case.mjml` in `src/templates/`
- Partials: `kebab-case.mjml` in `src/partials/`
- Data: `<template-name>.<variant>.json` in `data/` (e.g., `deal-won.example.json`)
- Subjects: `<template-name>.subject.hbs` in `src/subjects/`
- Output: `<template-name>.<variant>.html` + `<template-name>.<variant>.subject.txt` in `dist/`

## Template structure pattern
Every template follows:
1. `<mj-head>` with `<mj-include>` for responsive-styles and head-attributes, plus `<mj-preview>`
2. `<mj-body>` with header partial, content sections, sign-off partial, footer partial

## Data fixtures
- Nested objects: `dealer.firstName`, `deal.vehicle.make`
- Guard on specific keys: `{{#if tradeIn.hasTradeIn}}` not `{{#if tradeIn}}`
- Brand/unsubscribe fields are standard across all fixtures

## Handlebars helpers available
- `eq` — equality comparison
- `gte` — greater-than-or-equal
- `json` — JSON stringify

## Local testing
- Mailpit for SMTP testing: `brew install mailpit && mailpit` (web UI at localhost:8025)
- Preview UI at http://localhost:4000 when running `npm run dev`
