import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// This tells Node to read .env.local and populate process.env *before* Drizzle runs
dotenv.config({ path: ".env.local" });

export default defineConfig({
    schema: "./db/schema.ts",
    out: "./db/migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!, // Now guaranteed to be found!
    },
});