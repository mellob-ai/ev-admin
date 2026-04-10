# MOS Admin Panel (React)

A modular, responsive React + Vite admin panel with configurable features and day/dark themes.

## Tech Stack

- React
- Vite
- Chart.js
- CSS token system in `css/style.css`

## Getting Started

```bash
npm install
npm run dev
```

## Build for Production

```bash
npm run build
npm run preview
```

## Backend Plug-and-Play Integration

This panel now supports a patch-based API integration boundary for safe backend wiring.

1. Copy `.env.example` to `.env`.
2. Set `VITE_USE_BACKEND_API=true`.
3. Set `VITE_API_BASE_URL` to your backend base URL.
4. Start with `npm run dev`.

When API mode is disabled or unavailable, modules keep working in local storage mode.

### API Layer Structure

- `src/api/runtime.js` - env-driven API mode and runtime options.
- `src/api/httpClient.js` - centralized fetch client with timeout/auth/error normalization.
- `src/api/patches/` - endpoint + payload/response adapters (patch files).
- `src/api/services/` - module services consumed by feature pages.

Current integration:

- Users module wired with API + local fallback.
- Vehicles module wired with API + local fallback.
- Staff module wired with API + local fallback.
- Rides module wired with API + local fallback.
- Subscriptions module wired with API + local fallback.
- Pricing module wired with API + local fallback.
- Organizations module wired for API sync plus create/delete fallback-safe operations.
- Locations module wired for API sync plus create fallback-safe operations.

## Color Palette

Core palette used by the website:

- `#FFFFFF`
- `#E8F9F1`
- `#00a877`
- `#070707`

Theme variables are centrally managed in:

- `src/config/theme-config.js`
- `css/style.css`

## Modular Feature System

Navigation and feature metadata are centralized in:

- `src/config/feature-config.js`

Core page modules are split by feature:

- `src/features/dashboard/DashboardPage.jsx`
- `src/features/users/UsersPage.jsx`
- `src/features/analytics/AnalyticsPage.jsx`
- `src/features/orders/OrdersPage.jsx`
- `src/features/shared/SimplePage.jsx`

Chart datasets are configurable in:

- `src/config/chart-config.js`

## How to Add a New Feature (Customizable)

1. Add the feature entry in `src/config/feature-config.js` (`FEATURE_NAV_ITEMS` + optional subtitle metadata).
2. Create a page component in `src/features/<feature-name>/`.
3. Register the component in `src/App.jsx` (`PAGE_COMPONENTS`).

This keeps the admin panel scalable and easy to extend without rewriting the whole app shell.

## Responsive Behavior

- UI is compact by default (smaller base typography and tighter spacing).
- Layout adapts for mobile, foldables, tablets, and desktop.
- Day/dark theme works across all breakpoints.
