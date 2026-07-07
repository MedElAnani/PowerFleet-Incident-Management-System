import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

// Role Enum
export const roleEnum = pgEnum("user_role", ["client", "technician", "supportmanager", "admin"])

// 1. User Table
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    role: roleEnum("role").default("client").notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})