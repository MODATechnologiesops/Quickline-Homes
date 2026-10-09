import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL error:", error);
});

export async function testDatabaseConnection() {
    const result = await pool.query(
        "SELECT current_database() AS database"
    );

    return result.rows[0].database;
}

export default pool;