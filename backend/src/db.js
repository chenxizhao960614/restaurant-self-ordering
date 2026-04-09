const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function parseRejectUnauthorized() {
  const v = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "").toLowerCase().trim();
  if (v === "0" || v === "false" || v === "no") return false;
  if (v === "1" || v === "true" || v === "yes") return true;
  return null;
}

function getSslOption() {
  const host = process.env.DB_HOST || "";
  const sslFlag = String(process.env.DB_SSL || "").toLowerCase();
  const wantSsl =
    sslFlag === "1" || sslFlag === "true" || host.includes("aivencloud.com");
  if (!wantSsl) return undefined;

  const caPath = process.env.DB_SSL_CA_PATH;
  const explicitReject = parseRejectUnauthorized();

  if (caPath) {
    const resolved = path.isAbsolute(caPath) ? caPath : path.join(process.cwd(), caPath);
    const rejectUnauthorized = explicitReject === null ? true : explicitReject;
    return { ca: fs.readFileSync(resolved), rejectUnauthorized };
  }

  // Aiven without CA: Render/Node often fails verification ("self-signed certificate in chain").
  // Default to encrypted connection without strict CA check; override with DB_SSL_REJECT_UNAUTHORIZED=1.
  const aiven = host.includes("aivencloud.com");
  let rejectUnauthorized = true;
  if (explicitReject !== null) {
    rejectUnauthorized = explicitReject;
  } else if (aiven) {
    rejectUnauthorized = false;
  }

  return { rejectUnauthorized };
}

const ssl = getSslOption();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "restaurant_ordering",
  ...(ssl ? { ssl } : {}),
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 15000),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
