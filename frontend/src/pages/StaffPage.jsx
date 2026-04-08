import { useCallback, useEffect, useState } from "react";
import { getApiBase } from "../apiBase";

const API_BASE = getApiBase();
const POLL_INTERVAL_MS = 3000;

function locationText(order) {
  if (order.type === "table") return `Table ${order.locationId}`;
  if (order.type === "bar") return `Bar Seat ${order.locationId}`;
  return `To-Go (${order.customerName})`;
}

export default function StaffPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/orders`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load orders.");
      setOrders(data);
      setError("");
    } catch (e) {
      setError(e.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const timer = setInterval(loadOrders, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadOrders]);

  async function markEntered(orderId) {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "entered" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order.");
      loadOrders();
    } catch (e) {
      setError(e.message || "Failed to update order.");
    }
  }

  function getOrderTotal(order) {
    return order.items.reduce((sum, item) => sum + Number(item.unitPrice || 0) * item.quantity, 0);
  }

  return (
    <div className="container">
      <div className="page-hero">
        <h1>Staff Orders</h1>
        <p className="muted">Auto refresh every 3 seconds</p>
      </div>

      {error && <p className="message error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <div className="orders">
          {orders.map((order) => (
            <div className="card order-card" key={order.id}>
              <div>
                <strong>#{order.id}</strong> - {locationText(order)}
              </div>
              <div>
                Status: <span className={`status-pill status-${order.status}`}>{order.status}</span>
              </div>
              <div>
                Items:
                <ul>
                  {order.items.map((item, idx) => (
                    <li key={`${order.id}-${idx}-${item.name}`}>
                      {item.name} x {item.quantity} @ ${Number(item.unitPrice || 0).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
              {order.orderNote ? <div>Order Note: {order.orderNote}</div> : null}
              <div>Total: ${getOrderTotal(order).toFixed(2)}</div>
              <div>Time: {new Date(order.createdAt).toLocaleString()}</div>
              {order.status === "pending" && (
                <button className="secondary-btn" onClick={() => markEntered(order.id)}>
                  Mark as Entered
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
