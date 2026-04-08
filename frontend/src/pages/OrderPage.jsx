import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MENU_CATEGORIES } from "../menu";
import { getApiBase } from "../apiBase";

const API_BASE = getApiBase();

function getLocationLabel(type, id) {
  if (type === "table") return `Table ${id}`;
  if (type === "bar") return `Bar Seat ${id}`;
  if (type === "togo") return "To-Go";
  return "Unknown";
}

export default function OrderPage() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "";
  const id = searchParams.get("id");

  const [selectedItems, setSelectedItems] = useState({});
  const [customerName, setCustomerName] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isValidLocation = useMemo(() => {
    if (type === "table") {
      const n = Number(id);
      return Number.isInteger(n) && n >= 1 && n <= 7;
    }
    if (type === "bar") {
      const n = Number(id);
      return Number.isInteger(n) && n >= 1 && n <= 4;
    }
    if (type === "togo") {
      return !id;
    }
    return false;
  }, [type, id]);

  const isTogo = type === "togo";
  const selectedCount = Object.values(selectedItems).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );
  const selectedTotal = Object.values(selectedItems).reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );
  function changeQty(itemName, unitPrice, delta) {
    setSelectedItems((prev) => {
      const current = prev[itemName] || { quantity: 0, unitPrice };
      const nextQty = Math.max(0, current.quantity + delta);
      return {
        ...prev,
        [itemName]: { ...current, unitPrice, quantity: nextQty }
      };
    });
  }

  async function submitOrder(event) {
    event.preventDefault();
    setMessage("");

    if (!isValidLocation) {
      setMessage("Invalid QR URL.");
      return;
    }
    const orderItems = Object.entries(selectedItems)
      .filter(([, value]) => value.quantity > 0)
      .map(([name, value]) => ({
        name,
        quantity: value.quantity,
        unitPrice: Number(value.unitPrice || 0)
      }));

    if (orderItems.length === 0) {
      setMessage("Please choose at least one item.");
      return;
    }
    if (isTogo && !customerName.trim()) {
      setMessage("Please enter your name for to-go order.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        type,
        id: isTogo ? undefined : Number(id),
        customerName: isTogo ? customerName.trim() : "",
        orderNote: orderNote.trim(),
        items: orderItems
      };

      const res = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit order.");

      setMessage("Order submitted successfully.");
      window.alert("Order submitted successfully.");
      setSelectedItems({});
      setCustomerName("");
      setOrderNote("");
    } catch (error) {
      setMessage(error.message || "Failed to submit order.");
    } finally {
      setLoading(false);
    }
  }

  if (!isValidLocation) {
    return (
      <div className="container">
        <h1>Invalid Order Link</h1>
        <p>Please scan a valid QR code provided by the restaurant.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-hero">
        <h1>Ordering System</h1>
        <p className="muted">Location: {getLocationLabel(type, id)}</p>
      </div>

      <form onSubmit={submitOrder} className="card">
        {isTogo && (
          <label className="field">
            Customer Name
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter your name"
            />
          </label>
        )}
        <div className="field">
          <strong>Menu by Category</strong>
          <div className="menu-layout">
            <aside className="category-sidebar">
              {MENU_CATEGORIES.map((category) => (
                <a key={category.name} href={`#cat-${category.name.replaceAll(" ", "-")}`}>
                  {category.name}
                </a>
              ))}
            </aside>
            <div className="menu-category-list">
              {MENU_CATEGORIES.map((category) => (
                <section
                  key={category.name}
                  id={`cat-${category.name.replaceAll(" ", "-")}`}
                  className="menu-category card"
                >
                  <h3>{category.name}</h3>
                  <div className="menu-grid">
                    {category.items.map((item) => {
                      const itemState = selectedItems[item.name] || {
                        quantity: 0,
                        unitPrice: item.price
                      };
                      return (
                        <div key={item.name} className="menu-item-card">
                          <div className="menu-item-top">
                            <span>
                              {item.name} - ${item.price.toFixed(2)}
                            </span>
                            <div className="qty-controls">
                              <button
                                type="button"
                                onClick={() => changeQty(item.name, item.price, -1)}
                              >
                                -
                              </button>
                              <span className="qty-value">{itemState.quantity}</span>
                              <button
                                type="button"
                                onClick={() => changeQty(item.name, item.price, 1)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
        <label className="field">
          Order Note (optional)
          <textarea
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            placeholder="Example: no wasabi, extra ginger"
            rows={3}
          />
        </label>

        <div className="checkout-bar">
          <div>
            <div className="muted">Selected Items: {selectedCount}</div>
            <div className="checkout-total">${selectedTotal.toFixed(2)}</div>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Order"}
          </button>
        </div>

        {!isTogo && <p className="muted">You can scan and submit multiple times for the same table/bar.</p>}
      </form>

      {message && <p className="message">{message}</p>}
    </div>
  );
}
