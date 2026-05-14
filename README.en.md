# Helper Frontend

[中文](README.md)

A personal productivity web app for managing reminders, timers, todos, and finances.

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite 8
- **Styling:** Tailwind CSS 4
- **Routing:** React Router DOM 7
- **Charts:** Recharts
- **HTTP Client:** Axios

## Modules

| Module | Route | Description |
|--------|-------|-------------|
| Home | `/` | Dashboard |
| Reminders | `/reminders` | Reminder management |
| Timer | `/timer` | Count-up / countdown with a persistent footer widget |
| Todo | `/todo` | Task list management |
| Finance | `/finance` | Income & expense tracking with charts |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (requires backend running on localhost:3001)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## Notes

- API requests are proxied to `http://localhost:3001` (`/api` and `/uploads` paths)
- State management via Context API (`ActiveTimer`, `Reminders`)
- Custom hooks: `useTimer`, `useReminders`, `useResource`
