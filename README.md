# Email Workbench — MJML structure → Handlebars content

This project compiles **MJML first** (resolving `<mj-include>` for structure), then runs **Handlebars on the HTML** to fill content.

Quick start:
```bash
npm i
npm run dev
# Start Mailpit separately (UI http://localhost:8025)
npm run send -- --to your.email@domain.com
```
