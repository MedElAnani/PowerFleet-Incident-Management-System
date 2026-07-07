import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// 1. Initialize the raw postgres connection client pointing to our environment string
const queryClient = postgres(process.env.DATABASE_URL!);

// 2. Export the instance of Drizzle, combining the connection pool with your schema definitions
export const db = drizzle(queryClient, { schema });