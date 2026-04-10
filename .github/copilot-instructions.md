# Project Guidelines

## Architecture
- This is a single-page React + Vite admin panel with state-based page switching in `src/App.jsx`; do not introduce React Router unless the task explicitly requires an architecture change.
- Navigation metadata lives in `src/config/feature-config.js`, and page components live under `src/features/<feature>/`.
- When adding a feature page, update `src/config/feature-config.js`, create the page in `src/features/<feature>/`, and register it in `src/App.jsx`.
- Reusable UI belongs in `src/components/`. Shared data/config primitives belong in `src/config/` or `src/utils/`.

## Code Style
- Follow the existing React function-component style with hooks and local state.
- Keep changes modular and scoped to the affected feature instead of editing unrelated pages.
- Preserve the existing compact admin UI patterns and responsive behavior described in `README.md`.
- Prefer existing theme tokens and CSS variables from `src/config/theme-config.js` and `css/style.css` over hard-coded colors or one-off styling values.

## Build And Test
- Install dependencies with `npm install`.
- Use `npm run dev` for local development.
- Use `npm run build` to validate production output after substantial changes.
- Use `npm run preview` to verify the built app when needed.
- There is currently no configured test, lint, or type-check script in `package.json`; do not claim those checks were run unless you add and run them.

## Conventions
- Theme mode is managed through `src/config/theme-config.js` and body/class-based state in `src/App.jsx`; keep dark/light behavior and logo swapping intact.
- Charts are managed with Chart.js instance cleanup in `src/App.jsx`; destroy and recreate chart instances safely when modifying chart-driven pages.
- Feature labels, subtitles, and navigation structure are config-driven; prefer updating config metadata instead of duplicating strings in page components.
- For staff and operations workflows, link to `STAFF_OPERATIONS_ARCHITECTURE.md` instead of copying backend/schema details into source comments or new docs.
- For broader project setup and UI patterns, link to `README.md`. For UI-heavy implementation work in this codebase, consider using the existing `.github/agents/mos-admin-ui-builder.agent.md` specialist agent.