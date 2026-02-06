# Medical Facility Dashboard - Frontend

React/TypeScript dashboard with real-time updates.

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Frontend runs on http://localhost:5173
```

## Features

- **Login**: Authenticate with test credentials
- **Facility Status**: Real-time operational overview
- **Action Items**: Prioritized list requiring attention
- **Tasks**: Operational tasks (AI agent vs staff)
- **Metrics**: Daily performance summary

## Test Credentials

- Admin: `admin@clinic.com` / `password123`
- Doctor: `sarah.johnson@clinic.com` / `password123`
- Medical Assistant: `assistant@clinic.com` / `password123`

## Development

The frontend proxies API requests to the backend at `http://localhost:3000`.

Make sure the backend is running before starting the frontend.

## Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Structure

- `src/components/` - React components
- `src/services/` - API client
- `src/types/` - TypeScript interfaces
- `src/index.css` - Global styles
