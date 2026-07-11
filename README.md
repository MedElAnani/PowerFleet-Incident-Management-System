# Power Fleet IMS — Incident Management System

> A fleet incident management platform built with Next.js 16, React 19, TypeScript, Drizzle ORM, and PostgreSQL.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Role-Based Access Control](#role-based-access-control)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [CI/CD](#cicd)

---

## Overview

Power Fleet IMS allows fleet management companies to track and manage incidents reported by their clients. Clients can register, report incidents on their vehicles, and track their resolution. Internal staff (technicians, support managers, admins) handle, assign, and resolve incidents with full role-based access control.

---

## Tech Stack

| Category       | Technology                               |
| -------------- | ---------------------------------------- |
| **Framework**  | Next.js 16 (App Router) + React 19       |
| **Language**   | TypeScript (strict mode)                 |
| **Styling**    | Tailwind CSS v4 + PostCSS                |
| **Database**   | PostgreSQL via `postgres` driver         |
| **ORM**        | Drizzle ORM 0.45.x                       |
| **Auth**       | bcryptjs + JSON Web Tokens               |
| **Testing**    | Vitest 4.x + Supertest                   |
| **Linting**    | ESLint 9.x (`eslint-config-next`)        |
| **CI**         | GitHub Actions                           |

---

## Architecture

The project follows a layered architecture with clear separation of concerns:

```
HTTP Request
    │
    ▼
Next.js App Router (app/api/*/route.ts)
    │
    ▼
JWT Auth Middleware (middleware/auth.ts)
    │  • Extracts & verifies Bearer token
    │  • Optional role-based access control
    │  • Injects user payload into request
    │
    ▼
Route Handlers (app/api/*/route.ts)
    │  • Parse request body
    │  • Delegate to service layer
    │  • Return JSON responses
    │
    ▼
Service Layer (lib/services/)
    │  • Business logic & validation
    │  • Authorization checks (ownership, role)
    │  • Data access via Drizzle ORM
    │
    ▼
Database Layer (db/)
    │  • Drizzle ORM client
    │  • Schema definitions (8 tables, 6 enums)
    │  • Relations for eager loading
    │
    ▼
PostgreSQL Database
```

---

## Database Schema

### Tables

| Table              | Purpose                                |
| ------------------ | -------------------------------------- |
| `users`            | Base user table (polymorphic roles)    |
| `clients`          | Client companies (name, phone)         |
| `internal_users`   | Internal staff base                    |
| `admins`           | Full system access                     |
| `support_managers` | Incident oversight                     |
| `technicians`      | Incident resolution                    |
| `vehicles`         | Fleet vehicles (IMEI, license plate)   |
| `incidents`        | Incident reports with SLA tracking     |
| `incident_comments`| Comments on incidents with visibility   |
| `incident_events`  | Audit logs & timeline events history   |

### Enums

- `user_role` — `client`, `internal_user`
- `internal_user_role` — `admin`, `support_manager`, `technician`
- `incident_status` — `open`, `in_progress`, `resolved`, `closed`
- `incident_priority` — `low`, `medium`, `high`, `critical`
- `incident_type` — `gps_issue`, `accident`, `fuel_problem`, `maintenance`, `other`
- `admin_access_level` — `full`, `limited`
- `incident_comments_visibility` — `Public`, `Private`
- `event_type_enum` — `status_changed`, `priority_changed`, `technician_assigned`, `impact_calculated`, `details_updated`, `create_incident`, `comment`

### Key Relationships

- `users` → `clients` / `internal_users` (1:1)
- `internal_users` → `admins` / `support_managers` / `technicians` (1:1)
- `clients` → `vehicles` (1:N)
- `clients` → `incidents` (1:N)
- `vehicles` → `incidents` (1:N)
- `technicians` → `incidents` (1:N, assigned)
- `users` → `incident_comments` (1:N)
- `incidents` → `incident_comments` (1:N)
- `incidents` → `incident_events` (1:N)
- `users` → `incident_events` (1:N)

---

## Role-Based Access Control

| Role              | Permissions                                                      |
| ----------------- | ---------------------------------------------------------------- |
| **ClientUser**    | Register, create incidents, view/comment on own incidents, change own comments visibility |
| **Technician**    | View/comment on assigned incidents, change own comments visibility, resolve incidents |
| **SupportManager**| View all incidents, assign work, comment on any incident                          |
| **Admin**         | Full access, manage vehicles & users, comment on any incident, change any comment visibility |

---

## API Endpoints

### Authentication

| Method | Endpoint               | Description              | Auth Required |
| ------ | ---------------------- | ------------------------ | ------------- |
| POST   | `/api/auth/register`   | Register a new client    | No            |
| POST   | `/api/auth/login`      | Login, receive JWT       | No            |

### Incidents

| Method | Endpoint                                 | Description                               | Role Required     |
| ------ | ---------------------------------------- | ----------------------------------------- | ----------------- |
| GET    | `/api/incidents`                         | List incidents (scoped)                   | Any authenticated |
| POST   | `/api/incidents`                         | Create an incident                        | ClientUser        |
| GET    | `/api/incidents/:id`                     | Get incident by ID (includes comments)    | Any authenticated |
| PATCH  | `/api/incidents/:id`                     | Update an incident                        | Any authenticated |
| POST   | `/api/incidents/:id/comments`            | Add a comment to an incident              | Any authenticated |
| PATCH  | `/api/incidents/:id/comments/:commentId` | Update visibility of a comment            | Any authenticated |
| GET    | `/api/incidents/:id/events`              | Get incident history timeline events      | Any authenticated |
| GET    | `/api/events`                            | List global system audit logs             | InternalUser      |

### Vehicles

| Method | Endpoint               | Description              | Role Required     |
| ------ | ---------------------- | ------------------------ | ----------------- |
| POST   | `/api/vehicles`        | Create a vehicle         | Admin             |
| GET    | `/api/vehicles/:id`    | Get vehicle by ID        | Any authenticated |

---

## Getting Started

### Prerequisites

- Node.js >= 20
- PostgreSQL database
- npm / yarn / pnpm / bun

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd powerfleet_ims

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and JWT_SECRET

# Run database migrations
npx drizzle-kit push

# Start the development server
npm run dev
```

The server will start at [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Script        | Description                          |
| ------------- | ------------------------------------ |
| `npm run dev`   | Start dev server (Turbopack)       |
| `npm run build` | Production build                   |
| `npm run start` | Start production server            |
| `npm run lint`  | Run ESLint                         |
| `npm run test`  | Run Vitest tests                   |
| `npm run typecheck` | TypeScript type checking       |

---

## Project Structure

```
powerfleet_ims/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── auth/           # Authentication routes
│   │   ├── events/
│   │   │   └── route.ts      # GET list global system audit logs
│   │   ├── incidents/      # Incident routes
│   │   │   ├── [id]/
│   │   │   │   ├── comments/
│   │   │   │   │   ├── [commentId]/
│   │   │   │   │   │   └── route.ts  # PATCH update comment visibility
│   │   │   │   │   └── route.ts      # POST create comments
│   │   │   │   ├── events/
│   │   │   │   │   └── route.ts      # GET fetch incident timeline events
│   │   │   │   └── route.ts          # GET/PATCH incident detail/update
│   │   │   └── route.ts              # GET/POST list/create incidents
│   │   └── vehicles/       # Vehicle routes
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── db/                     # Database layer
│   ├── schema.ts           # Drizzle schema (tables & enums)
│   ├── relations.ts        # Drizzle relations
│   └── index.ts            # Drizzle client
├── lib/
│   └── services/           # Business logic
│       ├── audit.ts        # Audit logging service
│       ├── comments.ts     # Comment service
│       ├── events.ts       # Events timeline retrieval service
│       ├── incidents.ts    # Incident service
│       └── vehicles.ts     # Vehicle service
├── middleware/
│   └── auth.ts             # JWT auth + RBAC middleware
├── test/                   # Test files
├── public/                 # Static assets
├── drizzle.config.ts       # Drizzle Kit config
├── next.config.ts          # Next.js config
├── tsconfig.json           # TypeScript config
├── vitest.config.ts        # Vitest config
└── eslint.config.mjs       # ESLint config
```

---

## Environment Variables

| Variable       | Description                | Required |
| -------------- | -------------------------- | -------- |
| `DATABASE_URL` | PostgreSQL connection URL  | Yes      |
| `JWT_SECRET`   | Secret key for JWT signing | Yes      |

Copy `.env.example` to `.env.local` and fill in the values.

---

## CI/CD

GitHub Actions runs on every push/PR to `main`:
- **lint** — ESLint
- **typecheck** — TypeScript compilation check
- **test** — Vitest test suite
- **build** — Next.js production build

---

## License

MIT © Power Fleet
