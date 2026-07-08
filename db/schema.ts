import { pgTable, serial, text, timestamp, pgEnum, integer, doublePrecision } from "drizzle-orm/pg-core";

// 1. User Table

// Role Enum
export const roleEnum = pgEnum("user_role", ["client", "technician", "supportmanager", "admin"])

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    role: roleEnum("role").default("client").notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})

// 2. Clients Table
export const clients = pgTable("clients", {
    id: serial("id").primaryKey(),
    companyName: text("company_name").notNull(),
    phone: text('phone').notNull(),
    userId: integer('user_id')
        .references(() => users.id, { onDelete: "cascade" })
        .notNull()
})



// 3. Vehicles Table
export const vehicles = pgTable("vehicles", {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    imei: text('imei').notNull().unique(),
    licensePlate: text('license_plate').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow(),
    clientId: integer('client_id')
        .references(() => clients.id, { onDelete: "cascade" })
        .notNull()
})

// 4. Incidents Table

// Type Enum
export const typeEnum = pgEnum("incident_type", ["GPS Device", "Vehicle", "Driver", "Client Complaint", "Accident", "Fuel", "Mission", "Maintenance", "Payment", "System Bug", "Other"])

// Type Enum
export const priorityEnum = pgEnum("incident_priority", ["Low", "Medium", "High", "Critical"])

// Type Enum
export const statusEnum = pgEnum("incident_status", ["New", "Open", "In Progress", "Waiting Client", "Waiting Technician", "Resolved", "Closed", "Cancelled"])

export const incidents = pgTable("incidents", {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    type: typeEnum("type").notNull(),
    priority: priorityEnum("priority").notNull().default('Medium'),
    status: statusEnum("status").notNull().default('New'),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    address: text("address").notNull(),
    responseDueAt: timestamp("response_due_at"),
    resolutionDueAt: timestamp("resolution_due_at"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    clientId: integer('client_id')
        .references(() => clients.id, { onDelete: "cascade" })
        .notNull(),
    vehicleId: integer('vehicle_id')
        .references(() => vehicles.id, { onDelete: "cascade" })
        .notNull()
})