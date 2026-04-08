const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function getSslOption() {
  const host = process.env.DB_HOST || "";
  const sslFlag = String(process.env.DB_SSL || "").toLowerCase();
  const wantSsl =
    sslFlag === "1" || sslFlag === "true" || host.includes("aivencloud.com");
  if (!wantSsl) return undefined;

  const caPath = process.env.DB_SSL_CA_PATH;
  if (caPath) {
    const resolved = path.isAbsolute(caPath) ? caPath : path.join(process.cwd(), caPath);
    return { ca: fs.readFileSync(resolved), rejectUnauthorized: true };
  }

  // Aiven requires TLS; without a CA file, rely on the system trust store.
  return { rejectUnauthorized: true };
}

const ssl = getSslOption();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "restaurant_ordering",
  ...(ssl ? { ssl } : {}),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
