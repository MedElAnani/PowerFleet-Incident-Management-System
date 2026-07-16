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

The project follows a layered architecture with clear separation of concerns, structured strictly according to the UML specifications:

```
HTTP Request
    │
    ▼
Next.js App Router (app/api/*/route.ts)
    │
    ▼
JWT Auth Middleware (middleware/auth.ts)
    │  • Extracts & verifies Bearer token
    │  • Dynamically resolves subclass role presence
    │  • Injects user payload into request context
    │
    ▼
Route Handlers (app/api/*/route.ts)
    │  • Parse request body & Zod validation
    │  • Delegate to OOP Service classes
    │  • Return JSON responses
    │
    ▼
OOP Service Layer (lib/services/*)
    │  • Implemented as static-method classes
    │  • Enforces soft-delete & user status validations
    │  • Business logic & verification
    │  • Data access via Drizzle ORM
    │
    ▼
Database Layer (db/)
    │  • Drizzle ORM client
    │  • Class Table Inheritance (CTI) mappings
    │  • Relations for eager loading
    │
    ▼
PostgreSQL Database
```

---

## Database Schema

### Polymorphic Inheritance (CTI)
To satisfy strict role-less polymorphic inheritance requirements, the database contains **zero role string columns**. Instead, roles are resolved dynamically at runtime based on table presence (Class Table Inheritance):
*   `users` represents the abstract base entity.
*   `clients` and `internal_users` inherit from `users` (using their primary key as a foreign key pointing to `users.id`).
*   `admins`, `support_managers`, and `technicians` inherit from `internal_users`.

### Soft Delete Protocol
Entity soft-deletion does not use redundant boolean columns. Instead, it relies purely on nullability checks on `deletedAt: timestamp`. Queries filter active entities using `isNull(deletedAt)`.

### Tables

| Table              | Purpose                                                      |
| ------------------ | ------------------------------------------------------------ |
| `users`            | Base user table (abstract parent class)                      |
| `clients`          | Client company profile records                               |
| `internal_users`   | Base internal staff profiles (with `isActive` state check)   |
| `admins`           | System administrators (can manage users & close tickets)     |
| `support_managers` | Oversight managers (can assign incidents to technicians)     |
| `technicians`      | Technical resolvers (assigned to tickets, with availability) |
| `vehicles`         | Fleet vehicles (IMEI, license plate, registered owner)       |
| `incidents`        | Incident tickets with detailed SLA metrics                   |
| `incident_comments`| Comments on incidents with public/private visibility         |
| `incident_events`  | Timeline event logs representing audit logs history          |
| `incident_attachments` | Attachments uploaded by users (images/documents)           |
| `impact_links`     | Weight mapping indicating incident asset relationship links  |
| `generated_reports`| Generated reporting history log details                      |
| `security_audit_events` | Security access audit details                           |

---

## SLA (Service Level Agreement) Engine

The system features an automated Service Level Agreement (SLA) calculation engine. It evaluates tickets dynamically based on response and resolution milestone deadlines.

### Milestone Triggers
- **Response Deadline (`firstResponseAt`)**: Exclusively triggered when an internal staff member (`Admin`, `Support Manager`, or `Technician`) explicitly writes a comment on the ticket. Changes in status or ticket assignments *do not* artificially trigger response SLAs.
- **Resolution Deadline (`resolvedAt`)**: Triggered when the incident status is moved to `Resolved`.

### Due Date Offsets
| Priority | Response SLA Limit (From Creation) | Resolution SLA Limit (From First Response) |
| :--- | :--- | :--- |
| **Low** | `createdAt + 12 hours` | `firstResponseAt + 24 hours` |
| **Medium** | `createdAt + 6 hours` | `firstResponseAt + 12 hours` |
| **High** | `createdAt + 2 hours` | `firstResponseAt + 6 hours` |
| **Critical** | `createdAt + 30 minutes` | `firstResponseAt + 3 hours` |

### SLA Status States
1.  **Healthy:** Time remaining on pending milestone is above the warning thresholds.
2.  **Warning_Response:** Response is pending with warning time remaining.
3.  **Breached_Response:** Response deadline missed; resolution is still within limits.
4.  **Warning_Resolution:** Response was met on time; resolution is pending with warning time remaining.
5.  **Breached_Resolution:** Response was met on time; resolution deadline missed.
6.  **Breached_Both:** Both response and resolution deadlines missed.
7.  **Met:** Both response and resolution limits successfully met on time.
8.  **Met_With_Response_Breached:** Response deadline missed, but resolution met on time.
9.  **Met_With_Resolution_Breached:** Response met on time, but resolution deadline missed.

---

## Role-Based Access Control

*   **ClientUser:** Can register, create incidents, view/comment on own incidents, change own comments visibility. Forbidden from filtering by internal metrics (e.g. `slaStatus`).
*   **Technician:** Can view/comment on assigned incidents, change own comments visibility, resolve incidents.
*   **SupportManager:** Can view all incidents, assign work, comment on any incident.
*   **Admin:** Full access, manage vehicles & users, comment on any incident, change any comment visibility.

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
| GET    | `/api/incidents`                         | List incidents (supports dynamic query filtering) | Any authenticated |
| POST   | `/api/incidents`                         | Create an incident                        | ClientUser        |
| GET    | `/api/incidents/:id`                     | Get incident by ID (includes comments)    | Any authenticated |
| PATCH  | `/api/incidents/:id`                     | Update an incident                        | Any authenticated |
| GET    | `/api/incidents/:id/notes`               | List internal notes for an incident       | InternalUser      |
| POST   | `/api/incidents/:id/notes`               | Add an internal note to an incident       | InternalUser      |
| PATCH  | `/api/incidents/:id/notes/:noteId`       | Toggle pin status of an internal note     | InternalUser      |
| DELETE | `/api/incidents/:id/notes/:noteId`       | Soft-delete an internal note              | InternalUser      |
| POST   | `/api/incidents/:id/comments`            | Add a comment to an incident              | Any authenticated |
| PATCH  | `/api/incidents/:id/comments/:commentId` | Update visibility of a comment            | Any authenticated |
| GET    | `/api/incidents/:id/events`              | Get incident history timeline events      | Any authenticated |
| GET    | `/api/events`                            | List global system audit logs             | InternalUser      |
| POST   | `/api/cron/sla`                          | Trigger periodic SLA checks on open tickets| System/Cron Runner|

#### Incident Query Filters (GET `/api/incidents`)
Supports robust search queries dynamically built by Drizzle:
- `?search=` (Matches `ID` exact or `Title` fuzzy)
- `?status=Open,Resolved`
- `?priority=High,Critical`
- `?type=GPS Device,Vehicle`
- `?slaStatus=Breached_Both,Warning_Response` (Internal Users only)
- `?dateFrom=` & `?dateTo=` (ISO Strings)

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

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd powerfleet_ims

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with DATABASE_URL and JWT_SECRET

# Run database migrations
npx drizzle-kit push

# Start the development server
npm run dev
```

---

## Scripts

| Script                | Description                    |
| --------------------- | ------------------------------ |
| `npm run dev`         | Start dev server (Turbopack)   |
| `npm run build`       | Production build               |
| `npm run start`       | Start production server        |
| `npm run lint`        | Run ESLint                     |
| `npm run test`        | Run Vitest tests               |
| `npm run typecheck`   | TypeScript verification check  |

---

## Project Structure

```
powerfleet_ims/
├── app/                    # Next.js App Router & API Layer
│   └── api/                # HTTP Endpoint Handlers (auth, cron, events, incidents, vehicles)
├── db/                     # Database & Schema Layer (schema, relations, index client)
├── lib/
│   └── services/           # OOP Service Layer (incident, comment, vehicle, event, and SLA services)
├── middleware/             # Request Interceptors (JWT Auth, RBAC)
└── test/                   # Integration and Unit Test Suites (Vitest)
```

---

## License

MIT © Power Fleet
