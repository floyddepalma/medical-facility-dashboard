# Technical Debt & Demo Compromises

Items logged here are shortcuts or compromises made to accommodate the Monday demo (Feb 9, 2026). Each needs to be addressed before pushing to a real production environment.

## Database / Timezone

- **Seed data uses DB server clock**: The `seed-utilization.ts` script generates timestamps using `CURRENT_DATE` from the PostgreSQL server (UTC/GMT). In production, timestamps should be stored in UTC but queries should be timezone-aware relative to the facility's local timezone. The current approach works because we control when the seed runs, but real vision service data will come in with the client machine's clock.
- **No timezone configuration**: The Neon PostgreSQL instance runs in GMT. There's no facility-level timezone setting. Production needs a configurable timezone per facility so that "today's data" means the facility's local date, not UTC.

## Authentication & Security

- **Hardcoded JWT secret**: `JWT_SECRET` in `.env` is a static string. Production needs a proper secret management solution (AWS Secrets Manager, etc.).
- **API keys in `.env` files**: Vision service and Cara agent API keys are plain text in config files. Need proper secret rotation and management.
- **No HTTPS in development**: All local services run over HTTP. Production requires TLS everywhere.

## Analytics / Utilization

- **Seed data for demo rooms**: Rooms other than Exam Room 1 use seeded (fake) utilization data to simulate a full day. Production will have real vision service data for all rooms.
- **Polling instead of WebSocket**: Analytics page polls every 5 seconds. The app has WebSocket infrastructure but it's not initialized in the frontend. Production should use WebSocket for real-time updates to reduce server load.
- **No historical data retention policy**: `room_utilization` table grows unbounded. Need a data retention/archival strategy.

## Vision Service

- **Single camera per room**: Current setup assumes one camera per room. Production may need multiple camera angles or fallback cameras.
- **No camera health monitoring**: If the vision service crashes or the camera disconnects, there's no alerting mechanism beyond the room status going stale.
- **Detection thresholds tuned for demo**: The occupancy detector's `no_motion_frames_required` was increased from 10 to 40 frames (5s → 20s) and a 30-second occupied cooldown was added to prevent status flickering when a person sits still. These values work well for the demo but should be made configurable per-room in production, as different room sizes and camera angles may need different sensitivity settings.

## Frontend

- **Inline styles throughout**: Components use inline `style` objects instead of CSS modules or a design system. This works for the POC but doesn't scale for theming or maintainability.
- **No error boundaries**: A crash in one component (like the Analytics chart) can take down the whole page. Need React error boundaries around major sections.
- **No loading states for individual sections**: The Analytics page has a single loading state. Individual cards should have skeleton loaders.

## Infrastructure

- **No CI/CD pipeline**: No automated testing, building, or deployment. Need GitHub Actions or similar.
- **No environment separation**: Single Neon database used for development and demo. Production needs separate dev/staging/prod environments.
- **Redis disabled**: Caching is disabled (`REDIS_ENABLED=false`). Production with multiple users needs Redis for session management and query caching.

---

*Last updated: Feb 7, 2026*
*Review before: First production deployment*
