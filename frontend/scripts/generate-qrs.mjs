import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import QRCode from "qrcode";

const outDir = path.resolve("public/qr");
const port = process.env.PORT || "5173";

function detectLocalIp() {
  const interfaces = os.networkInterfaces();
  const preferredNames = ["en0", "en1", "Ethernet", "Wi-Fi"];

  const pickFrom = (name) => {
    const list = interfaces[name] || [];
    for (const item of list) {
      if (!item || item.family !== "IPv4" || item.internal) continue;
      if (item.address.startsWith("192.168.") || item.address.startsWith("10.") || item.address.startsWith("172.")) {
        return item.address;
      }
    }
    return null;
  };

  for (const name of preferredNames) {
    const ip = pickFrom(name);
    if (ip) return ip;
  }

  for (const name of Object.keys(interfaces)) {
    const ip = pickFrom(name);
    if (ip) return ip;
  }

  return null;
}

function resolveBaseUrl() {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/+$/, "");
  }
  if (process.env.AUTO_IP === "1") {
    const ip = detectLocalIp();
    if (ip) return `http://${ip}:${port}`;
  }
  return `http://localhost:${port}`;
}

const baseUrl = resolveBaseUrl();

function buildEntries() {
  const entries = [];
  for (let i = 1; i <= 7; i += 1) {
    entries.push({
      filename: `table-${i}.png`,
      url: `${baseUrl}/order?type=table&id=${i}`
    });
  }
  for (let i = 1; i <= 4; i += 1) {
    entries.push({
      filename: `bar-${i}.png`,
      url: `${baseUrl}/order?type=bar&id=${i}`
    });
  }
  entries.push({
    filename: "togo.png",
    url: `${baseUrl}/order?type=togo`
  });
  return entries;
}

function entryLabel(filename) {
  if (filename.startsWith("table-")) return `Table ${filename.replace("table-", "").replace(".png", "")}`;
  if (filename.startsWith("bar-")) return `Bar ${filename.replace("bar-", "").replace(".png", "")}`;
  return "To-Go";
}

function renderPoster(entries) {
  const tableEntries = entries.filter((x) => x.filename.startsWith("table-"));
  const barEntries = entries.filter((x) => x.filename.startsWith("bar-"));
  const togoEntries = entries.filter((x) => x.filename.startsWith("togo"));

  const section = (title, list) => `
    <section class="section">
      <h2>${title}</h2>
      <div class="grid">
        ${list
          .map(
            (entry) => `
          <div class="card">
            <img src="./${entry.filename}" alt="${entryLabel(entry.filename)} QR" />
            <div class="label">${entryLabel(entry.filename)}</div>
            <div class="url">${entry.url}</div>
          </div>
        `
          )
          .join("")}
      </div>
    </section>
  `;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QR Poster</title>
  <style>
    * { box-sizing: border-box; font-family: Arial, sans-serif; }
    body { margin: 0; color: #111; }
    .page { padding: 16px; }
    h1 { margin: 0 0 8px; }
    .muted { margin: 0 0 16px; color: #555; font-size: 13px; }
    .section { margin-bottom: 14px; break-inside: avoid; }
    .section h2 { margin: 0 0 8px; font-size: 18px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .card { border: 1px solid #ddd; border-radius: 6px; padding: 8px; text-align: center; }
    .card img { width: 100%; height: auto; }
    .label { margin-top: 6px; font-weight: 700; font-size: 14px; }
    .url { margin-top: 4px; color: #555; font-size: 10px; word-break: break-all; }
    @media print {
      @page { size: A4 portrait; margin: 10mm; }
      .page { padding: 0; }
    }
  </style>
</head>
<body>
  <main class="page">
    <h1>Restaurant Ordering QR Codes</h1>
    <p class="muted">Base URL: ${baseUrl}</p>
    ${section("Tables (1-7)", tableEntries)}
    ${section("Bar Seats (1-4)", barEntries)}
    ${section("To-Go", togoEntries)}
  </main>
</body>
</html>`;
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const entries = buildEntries();
  for (const entry of entries) {
    const targetPath = path.join(outDir, entry.filename);
    await QRCode.toFile(targetPath, entry.url, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 420
    });
  }

  const indexText = entries
    .map((entry) => `${entry.filename}: ${entry.url}`)
    .join("\n");
  await fs.writeFile(path.join(outDir, "urls.txt"), `${indexText}\n`, "utf8");
  await fs.writeFile(path.join(outDir, "poster.html"), renderPoster(entries), "utf8");
  console.log(`Generated ${entries.length} QR codes in ${outDir}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Poster: ${path.join(outDir, "poster.html")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
