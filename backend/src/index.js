require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const VALID_TYPES = new Set(["table", "bar", "togo"]);
const VALID_STATUS = new Set(["pending", "entered"]);
const VALID_GUEST_TAGS = new Set(["guest1", "guest2", "guest3", "guest4"]);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || "";
const TWILIO_TO_NUMBER = process.env.TWILIO_TO_NUMBER || "";

function parseItemsField(rawValue) {
  const fallback = { guestTag: null, orderNote: "", items: [] };

  if (Array.isArray(rawValue)) {
    return {
      guestTag: null,
      orderNote: "",
      items: rawValue
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .map((name) => ({ name, quantity: 1, unitPrice: 0 }))
    };
  }

  if (rawValue == null) {
    return fallback;
  }

  if (typeof rawValue === "string") {
    const text = rawValue.trim();
    if (!text) return fallback;
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return {
          guestTag: null,
          orderNote: "",
          items: parsed
            .map((item) => String(item || "").trim())
            .filter(Boolean)
            .map((name) => ({ name, quantity: 1, unitPrice: 0 }))
        };
      }
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
        const guestTag = VALID_GUEST_TAGS.has(parsed.guestTag) ? parsed.guestTag : null;
        const orderNote = String(parsed.orderNote || "").trim();
        const items = parsed.items
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const name = String(item.name || "").trim();
            const quantity = Number(item.quantity);
            const unitPrice = Number(item.unitPrice || 0);
            if (!name || !Number.isInteger(quantity) || quantity <= 0) return null;
            if (!Number.isFinite(unitPrice) || unitPrice < 0) return null;
            return { name, quantity, unitPrice };
          })
          .filter(Boolean);
        return { guestTag, orderNote, items };
      }
    } catch (_error) {
      // Backward compatibility for old non-JSON records.
      return {
        guestTag: null,
        orderNote: "",
        items: text
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .map((name) => ({ name, quantity: 1, unitPrice: 0 }))
      };
    }
    return fallback;
  }

  // mysql2 may return JSON column as object directly.
  if (rawValue && typeof rawValue === "object" && Array.isArray(rawValue.items)) {
    const guestTag = VALID_GUEST_TAGS.has(rawValue.guestTag) ? rawValue.guestTag : null;
    const orderNote = String(rawValue.orderNote || "").trim();
    const items = rawValue.items
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const name = String(item.name || "").trim();
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice || 0);
        if (!name || !Number.isInteger(quantity) || quantity <= 0) return null;
        if (!Number.isFinite(unitPrice) || unitPrice < 0) return null;
        return { name, quantity, unitPrice };
      })
      .filter(Boolean);
    return { guestTag, orderNote, items };
  }

  return fallback;
}

function normalizeOrderItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === "string") {
        const name = item.trim();
        if (!name) return null;
        return { name, quantity: 1, unitPrice: 0 };
      }
      if (!item || typeof item !== "object") return null;
      const name = String(item.name || "").trim();
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice || 0);
      if (!name) return null;
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 99) return null;
      if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 9999) return null;
      return { name, quantity, unitPrice: Number(unitPrice.toFixed(2)) };
    })
    .filter(Boolean);
}

function validateLocation({ type, id }) {
  if (!VALID_TYPES.has(type)) {
    return "Invalid type. Must be table, bar, or togo.";
  }
  if (type === "table") {
    const n = Number(id);
    if (!Number.isInteger(n) || n < 1 || n > 7) {
      return "Table id must be 1-7.";
    }
  }
  if (type === "bar") {
    const n = Number(id);
    if (!Number.isInteger(n) || n < 1 || n > 4) {
      return "Bar id must be 1-4.";
    }
  }
  if (type === "togo" && id != null) {
    return "To-go should not have id.";
  }
  return null;
}

function locationLabel(type, id, customerName) {
  if (type === "table") return `Table ${id}`;
  if (type === "bar") return `Bar ${id}`;
  return `To-Go (${customerName || "Guest"})`;
}

async function sendOrderNotification(order) {
  const itemsText = order.items
    .map((item) => `- ${item.name} x${item.quantity}`)
    .join("\n");
  const total = order.items.reduce(
    (sum, item) => sum + Number(item.unitPrice || 0) * item.quantity,
    0
  );
  const lines = [
    "New Order",
    `Order #${order.id}`,
    `Location: ${locationLabel(order.type, order.idValue, order.customerName)}`,
    itemsText,
    `Total: $${total.toFixed(2)}`
  ];
  if (order.orderNote) {
    lines.push(`Note: ${order.orderNote}`);
  }

  const text = lines.join("\n");

  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text
        })
      });
    } catch (error) {
      console.error("Failed to send Telegram notification:", error.message);
    }
  }

  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER && TWILIO_TO_NUMBER) {
    try {
      const body = new URLSearchParams({
        From: TWILIO_FROM_NUMBER,
        To: TWILIO_TO_NUMBER,
        Body: text
      });
      const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      });
    } catch (error) {
      console.error("Failed to send Twilio SMS:", error.message);
    }
  }
}

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const { type, id, customerName, items, guestTag, orderNote } = req.body;

    const locationError = validateLocation({ type, id });
    if (locationError) {
      return res.status(400).json({ error: locationError });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "At least one menu item is required." });
    }

    const normalizedItems = normalizeOrderItems(items);
    if (normalizedItems.length === 0) {
      return res.status(400).json({ error: "At least one valid menu item is required." });
    }

    const safeCustomerName = String(customerName || "").trim();
    if (type === "togo" && !safeCustomerName) {
      return res.status(400).json({ error: "Customer name is required for to-go orders." });
    }
    if ((type === "table" || type === "bar") && safeCustomerName) {
      return res.status(400).json({ error: "Customer name is not allowed for table/bar orders." });
    }
    const safeGuestTag = String(guestTag || "").trim().toLowerCase();
    if ((type === "table" || type === "bar") && safeGuestTag && !VALID_GUEST_TAGS.has(safeGuestTag)) {
      return res.status(400).json({ error: "Guest must be guest1, guest2, guest3, or guest4." });
    }
    if (type === "togo" && safeGuestTag) {
      return res.status(400).json({ error: "Guest is not allowed for to-go orders." });
    }
    const safeOrderNote = String(orderNote || "").trim().slice(0, 300);

    const orderLocationId = type === "togo" ? null : Number(id);
    const [result] = await pool.query(
      `
      INSERT INTO orders (type, location_id, customer_name, items_json, status)
      VALUES (?, ?, ?, ?, 'pending')
      `,
      [
        type,
        orderLocationId,
        type === "togo" ? safeCustomerName : null,
        JSON.stringify({
          guestTag: type === "togo" ? null : safeGuestTag || null,
          orderNote: safeOrderNote,
          items: normalizedItems
        })
      ]
    );

    sendOrderNotification({
      id: result.insertId,
      type,
      idValue: orderLocationId,
      customerName: type === "togo" ? safeCustomerName : "",
      orderNote: safeOrderNote,
      items: normalizedItems
    });

    return res.status(201).json({ id: result.insertId });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/orders", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT id, type, location_id AS locationId, customer_name AS customerName, items_json AS itemsJson, status, created_at AS createdAt
      FROM orders
      ORDER BY created_at ASC
      `
    );

    const orders = rows.map((row) => {
      const parsed = parseItemsField(row.itemsJson);
      return {
        ...row,
        guestTag: parsed.guestTag,
        orderNote: parsed.orderNote,
        items: parsed.items
      };
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/orders/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid order id." });
    }
    if (!VALID_STATUS.has(status)) {
      return res.status(400).json({ error: "Status must be pending or entered." });
    }

    const [result] = await pool.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Order not found." });
    }

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
