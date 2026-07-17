// db/index.ts
import { drizzle } from "drizzle-orm/postgres-js"; // Or your matching database driver (e.g., node-postgres or neon)
import postgres from "postgres"; 
import * as schema from "./schema";
import * as relations from "./relations"; // ◄── Import your relations mapping

const connectionString = process.env.DATABASE_URL!;
const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, { 
    // Spreading both ensures Drizzle registers how the tables hook together in memory
    schema: { ...schema, ...relations } 
});