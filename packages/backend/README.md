# Medical Facility Dashboard - Backend

Node.js/Express API server with TypeScript, PostgreSQL, and Redis.

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
```

### Database Setup

```bash
# Run migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

### Development

```bash
# Start development server
npm run dev

# Server runs on http://localhost:3000
```

## Test Credentials

After seeding:
- **Admin**: `admin@clinic.com` / `password123`
- **Doctor**: `sarah.johnson@clinic.com` / `password123`
- **Medical Assistant**: `assistant@clinic.com` / `password123`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Facility
- `GET /api/facility/status` - Facility status
- `GET /api/facility/rooms` - List rooms
- `PUT /api/facility/rooms/:id/status` - Update room
- `GET /api/facility/equipment` - List equipment
- `PUT /api/facility/equipment/:id` - Update equipment

### Actions
- `GET /api/actions` - List action items
- `POST /api/actions` - Create action item
- `PUT /api/actions/:id` - Update action item
- `DELETE /api/actions/:id` - Delete action item

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `GET /api/tasks/history` - Task history

### Metrics
- `GET /api/metrics/daily` - Daily metrics
- `GET /api/metrics/trends` - 7-day trends

### Doctors
- `GET /api/doctors` - List doctors
- `GET /api/doctors/:id` - Get doctor

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm test             # Run tests
npm run type-check   # TypeScript check
npm run lint         # Lint code
```

## Architecture

- **Routes**: HTTP endpoint handlers
- **Middleware**: Auth, validation, audit logging
- **Services**: Business logic and external integrations
- **Database**: PostgreSQL with connection pooling
- **Cache**: Redis for performance
- **Types**: Shared TypeScript interfaces

## Security

- JWT authentication
- Role-based access control
- Input validation with Zod
- SQL injection prevention
- Audit logging
- PII filtering
