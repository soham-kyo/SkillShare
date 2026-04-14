import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import "dotenv/config";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set. Ensure you have a .env file locally.");
}
if (connectionString.includes("[PASSWORD]")) {
  throw new Error("DATABASE_URL contains placeholders. Please update your .env file with your actual Supabase connection string.");
}

export const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
  max: 10,
  connectionTimeoutMillis: 5000,
});
export const db = drizzle(pool, { schema });
