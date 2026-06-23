import mysql from "mysql2/promise";

let pool;

function getEnv(key) {
  const v = process.env[key];
  return v === undefined || v === "" ? undefined : v;
}

function createPool() {
  const host = getEnv("DB_HOST");
  const port = getEnv("DB_PORT");
  const user = getEnv("DB_USER");
  const password = getEnv("DB_PASSWORD");
  const database = getEnv("DB_NAME");

  if (!host || !user || !database) {
    throw new Error(
      "Database is not configured. Missing DB_HOST / DB_USER / DB_NAME"
    );
  }

  // 1. Ensure DB exists
  const ensureDatabase = async () => {
    const tmp = await mysql.createConnection({
      host,
      port: port ? Number(port) : 3306,
      user,
      password: password || "",
      multipleStatements: true,
      timezone: "Z",
    });

    try {
      await tmp.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    } finally {
      await tmp.end();
    }
  };

  // 2. Ensure tables exist (RUN ONCE)
  if (!globalThis.__db_initialized__) {
    globalThis.__db_initialized__ = ensureDatabase()
      .then(async () => {
        const conn = await mysql.createConnection({
          host,
          port: port ? Number(port) : 3306,
          user,
          password: password || "",
          database,
          timezone: "Z",
        });

        try {
          // OTP table (unchanged)
          await conn.execute(`
            CREATE TABLE IF NOT EXISTS otp_verifications (
              id BIGINT AUTO_INCREMENT PRIMARY KEY,
              mobile VARCHAR(20) NOT NULL,
              otp VARCHAR(10) NOT NULL,
              status ENUM('pending','verified','not_verified') NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              verified_at TIMESTAMP NULL
            )
          `);

          // CALL REPORTS (FIXED FOR CLOUDSHOPE)
          await conn.execute(`
            CREATE TABLE IF NOT EXISTS call_reports (
              id BIGINT AUTO_INCREMENT PRIMARY KEY,

              campaign_id VARCHAR(50),
              from_number VARCHAR(20),
              to_number VARCHAR(20),
              cli_number VARCHAR(20),

              from_number_status VARCHAR(50),
              to_number_status VARCHAR(50),

              answer_time VARCHAR(50),
              recording_url TEXT,

              uniqueid VARCHAR(100),
              start_time VARCHAR(50),
              end_time VARCHAR(50),

              raw_payload JSON,

              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);

          // Indexes
          await conn.execute(`
            CREATE INDEX idx_call_created_at ON call_reports (created_at)
          `).catch(() => {});

          await conn.execute(`
            CREATE INDEX idx_call_uniqueid ON call_reports (uniqueid)
          `).catch(() => {});

          await conn.execute(`
            CREATE INDEX idx_call_campaign ON call_reports (campaign_id)
          `).catch(() => {});
        } finally {
          await conn.end();
        }
      })
      .catch((err) => {
        console.error("DB INIT ERROR:", err.message);
      });
  }

  // 3. Create pool
  pool = mysql.createPool({
    host,
    port: port ? Number(port) : 3306,
    user,
    password: password || "",
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "Z",
  });

  return pool;
}

export function getPool() {
  if (!pool) pool = createPool();
  return pool;
}