import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MENU_CATEGORIES as FALLBACK_MENU } from "../menu";
import { getApiBase } from "../apiBase";

const API_BASE = getApiBase();

const GUEST_IDS = [1, 2, 3, 4];
const TOGO_BAG_NAME = "To-go bag";
const TOGO_BAG_PRICE = 0.25;

function emptyGuestCarts() {
  return { 1: {}, 2: {}, 3: {}, 4: {} };
}

function getLocationLabel(type, id) {
  if (type === "table") return `Table ${id}`;
  if (type === "bar") return `Bar seat ${id}`;
  if (type === "togo") return "To-go";
  return "Unknown";
}

function cartTotals(cart) {
  let count = 0;
  let total = 0;
  Object.values(cart).forEach((v) => {
    count += Number(v.quantity || 0);
    total += Number(v.quantity || 0) * Number(v.unitPrice || 0);
  });
  return { count, total };
}

export default function OrderPage() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "";
  const id = searchParams.get("id");

  const [menuCategories, setMenuCategories] = useState(FALLBACK_MENU);
  const [menuLoading, setMenuLoading] = useState(true);

  const [selectedItems, setSelectedItems] = useState({});
  const [selectedByGuest, setSelectedByGuest] = useState(emptyGuestCarts);
  const [activeGuest, setActiveGuest] = useState(1);

  const [customerName, setCustomerName] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const [togoBagQty, setTogoBagQty] = useState(0);

  const isValidLocation = useMemo(() => {
    if (type === "table") {
      const n = Number(id);
      return Number.isInteger(n) && n >= 1 && n <= 7;
    }
    if (type === "bar") {
      const n = Number(id);
      return Number.isInteger(n) && n >= 1 && n <= 4;
    }
    if (type === "togo") return !id;
    return false;
  }, [type, id]);

  const isTogo = type === "togo";
  const isTableOrBar = type === "table" || type === "bar";

  useEffect(() => {
    let cancelled = false;
    async function loadMenu() {
      setMenuLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/menu`);
        const data = await res.json();
        if (!res.ok) throw new Error("no api");
        const cats = data.categories || [];
        if (!cancelled && cats.length > 0) {
          setMenuCategories(
            cats.map((c) => ({
              id: c.id,
              name: c.name,
              items: (c.items || []).map((i) => ({
                id: i.id,
                name: i.name,
                price: Number(i.price)
              }))
            }))
          );
        }
      } catch {
        if (!cancelled) setMenuCategories(FALLBACK_MENU);
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    }
    loadMenu();
    return () => {
      cancelled = true;
    };
  }, []);

  const grandFromGuests = useMemo(() => {
    return GUEST_IDS.reduce(
      (acc, g) => {
        const { count, total } = cartTotals(selectedByGuest[g]);
        acc.count += count;
        acc.total += total;
        return acc;
      },
      { count: 0, total: 0 }
    );
  }, [selectedByGuest]);

  const togoStats = useMemo(() => cartTotals(selectedItems), [selectedItems]);

  const filteredMenu = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    if (!q) return menuCategories;
    return menuCategories
      .map((cat) => ({
        ...cat,
        items: (cat.items || []).filter((i) => i.name.toLowerCase().includes(q))
      }))
      .filter((cat) => cat.items.length > 0);
  }, [menuCategories, menuSearch]);

  function changeQtyTogo(itemName, unitPrice, delta) {
    setSelectedItems((prev) => {
      const current = prev[itemName] || { quantity: 0, unitPrice };
      const nextQty = Math.max(0, current.quantity + delta);
      return { ...prev, [itemName]: { ...current, unitPrice, quantity: nextQty } };
    });
  }

  function changeQtyGuest(guestNum, itemName, unitPrice, delta) {
    setSelectedByGuest((prev) => {
      const g = { ...prev[guestNum] };
      const current = g[itemName] || { quantity: 0, unitPrice };
      const nextQty = Math.max(0, current.quantity + delta);
      g[itemName] = { ...current, unitPrice, quantity: nextQty };
      return { ...prev, [guestNum]: g };
    });
  }

  function buildPayloadItems() {
    if (isTogo) {
      const lines = Object.entries(selectedItems)
        .filter(([, v]) => v.quantity > 0)
        .map(([name, v]) => ({
          name,
          quantity: v.quantity,
          unitPrice: Number(v.unitPrice || 0)
        }));
      if (togoBagQty > 0) {
        lines.push({
          name: TOGO_BAG_NAME,
          quantity: togoBagQty,
          unitPrice: TOGO_BAG_PRICE
        });
      }
      return lines;
    }
    const out = [];
    for (const g of GUEST_IDS) {
      const cart = selectedByGuest[g];
      for (const [name, v] of Object.entries(cart)) {
        if (v.quantity > 0) {
          out.push({
            name,
            quantity: v.quantity,
            unitPrice: Number(v.unitPrice || 0),
            guestIndex: g
          });
        }
      }
    }
    return out;
  }

  async function submitOrder(event) {
    event.preventDefault();
    setMessage("");

    if (!isValidLocation) {
      setMessage("Invalid QR link.");
      return;
    }

    const orderItems = buildPayloadItems();
    if (orderItems.length === 0) {
      setMessage("Add at least one item before submitting.");
      return;
    }
    if (isTogo && !customerName.trim()) {
      setMessage("Please enter your name for to-go.");
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
      if (!res.ok) throw new Error(data.error || "Submit failed.");

      setMessage("Order sent to the kitchen. Thank you!");
      window.alert("Order submitted successfully.");
      setSelectedItems({});
      setSelectedByGuest(emptyGuestCarts());
      setActiveGuest(1);
      setCustomerName("");
      setOrderNote("");
      setTogoBagQty(0);
    } catch (error) {
      setMessage(error.message || "Submit failed.");
    } finally {
      setLoading(false);
    }
  }

  function renderMenuBody() {
    const changeHandler = isTableOrBar
      ? (name, price, d) => changeQtyGuest(activeGuest, name, price, d)
      : (name, price, d) => changeQtyTogo(name, price, d);

    const getState = (itemName, price) => {
      if (isTableOrBar) {
        const g = selectedByGuest[activeGuest];
        return g[itemName] || { quantity: 0, unitPrice: price };
      }
      return selectedItems[itemName] || { quantity: 0, unitPrice: price };
    };

    return filteredMenu.map((category) => (
      <section
        key={category.id || category.name}
        id={`cat-${category.id || category.name}`}
        className="menu-category menu-category-surface"
      >
        <h3 className="menu-category-title">{category.name}</h3>
        <div className="menu-grid menu-grid-compact">
          {(category.items || []).map((item) => {
            const price = Number(item.price);
            const st = getState(item.name, price);
            return (
              <div key={item.id || item.name} className="menu-item-card menu-item-compact">
                <div className="menu-item-body menu-item-compact-body">
                  <div className="menu-item-text menu-item-compact-text">
                    <span className="dish-name">{item.name}</span>
                    <span className="dish-price">${price.toFixed(2)}</span>
                  </div>
                  <div className="qty-controls qty-controls-compact qty-stepper">
                    {st.quantity > 0 ? (
                      <>
                        <button
                          type="button"
                          className="qty-btn qty-btn-sm"
                          onClick={() => changeHandler(item.name, price, -1)}
                          aria-label="Decrease"
                        >
                          −
                        </button>
                        <span className="qty-value qty-value-sm">{st.quantity}</span>
                        <button
                          type="button"
                          className="qty-btn qty-btn-sm qty-btn-plus"
                          onClick={() => changeHandler(item.name, price, 1)}
                          aria-label="Increase"
                        >
                          +
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="qty-btn qty-btn-sm qty-btn-plus qty-btn-add-only"
                        onClick={() => changeHandler(item.name, price, 1)}
                        aria-label="Add"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    ));
  }

  if (!isValidLocation) {
    return (
      <div className="container order-page">
        <div className="card invalid-card">
          <h1>Invalid link</h1>
          <p className="muted">Please scan the QR code from your table or the counter.</p>
        </div>
      </div>
    );
  }

  const displayCount = isTableOrBar
    ? grandFromGuests.count
    : togoStats.count + togoBagQty;
  const displayTotal = isTableOrBar
    ? grandFromGuests.total
    : togoStats.total + togoBagQty * TOGO_BAG_PRICE;

  const messageIsSuccess =
    message && /thank you|sent to the kitchen|successfully/i.test(message);

  return (
    <div className="container order-page">
      <header className="order-header">
        <div className="order-header-inner">
          <p className="order-brand">Order here</p>
          <h1 className="order-title">{getLocationLabel(type, id)}</h1>
        </div>
      </header>

      {message ? (
        <div
          className={`order-notice ${messageIsSuccess ? "order-notice-success" : "order-notice-error"}`}
          role="status"
        >
          {message}
        </div>
      ) : null}

      <form onSubmit={submitOrder} className="order-form">
        {isTogo && (
          <div className="card soft-card field-block">
            <label className="field-label">Your name</label>
            <input
              className="input-lg"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="For pickup label"
              autoComplete="name"
            />
          </div>
        )}

        {isTableOrBar && (
          <div className="card soft-card guest-block guest-block-minimal">
            <div className="guest-tabs" role="tablist" aria-label="Guest">
              {GUEST_IDS.map((g) => {
                const { count } = cartTotals(selectedByGuest[g]);
                const active = activeGuest === g;
                return (
                  <button
                    key={g}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={`Guest ${g}`}
                    className={`guest-tab ${active ? "guest-tab-active" : ""}`}
                    onClick={() => setActiveGuest(g)}
                  >
                    <span className="guest-tab-label">G{g}</span>
                    {count > 0 && <span className="guest-tab-badge">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="menu-shell card">
          <div className="menu-shell-head">
            <h2 className="menu-shell-title">Menu</h2>
            {menuLoading && <span className="muted small">Loading…</span>}
          </div>
          <div className="menu-search-row">
            <input
              type="search"
              className="menu-search-input"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              placeholder="Search dishes…"
              enterKeyHint="search"
              aria-label="Search menu"
            />
          </div>
          <div className="menu-layout menu-layout-scroll">
            <aside className="category-sidebar category-sidebar-scroll category-sidebar-vertical">
              {menuCategories.map((category) => (
                <a
                  key={category.id || category.name}
                  href={`#cat-${category.id || category.name}`}
                  className="cat-pill cat-pill-vertical"
                >
                  {category.name}
                </a>
              ))}
            </aside>
            <div className="menu-category-list menu-category-list-scroll">
              {filteredMenu.length === 0 ? (
                <p className="muted menu-empty">No dishes match. Clear search or pick a category.</p>
              ) : (
                renderMenuBody()
              )}
            </div>
          </div>
        </div>

        <div className="card soft-card field-block">
          <label className="field-label">Order note (optional)</label>
          <textarea
            className="input-lg"
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            placeholder="Allergies, spice level, utensils…"
            rows={3}
          />
        </div>

        {isTableOrBar && displayCount > 0 && (
          <details className="card soft-card order-review" open>
            <summary className="order-review-summary">
              <span>Review order</span>
              <span className="order-review-meta">
                {displayCount} items · ${displayTotal.toFixed(2)}{" "}
                <span className="before-tax-inline">(before tax)</span>
              </span>
            </summary>
            <div className="order-review-body">
              {GUEST_IDS.map((g) => {
                const cart = selectedByGuest[g];
                const lines = Object.entries(cart).filter(([, v]) => v.quantity > 0);
                if (lines.length === 0) return null;
                return (
                  <div key={g} className="review-guest-block">
                    <div className="review-guest-title">Guest {g}</div>
                    <ul className="review-list">
                      {lines.map(([name, v]) => (
                        <li key={name}>
                          {name} × {v.quantity}{" "}
                          <span className="muted">(${ (v.quantity * v.unitPrice).toFixed(2) })</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </details>
        )}

        <div className="checkout-dock">
          <div className="checkout-dock-inner">
            <div className="checkout-summary-block">
              <div className="checkout-label">Total</div>
              <div className="checkout-amount">${displayTotal.toFixed(2)}</div>
              <div className="checkout-before-tax">Before tax</div>
            </div>
            <div className="checkout-dock-trailing">
              {isTogo && (
                <div className="checkout-togo-bag checkout-togo-bag-inline">
                  <span className="checkout-togo-bag-line">
                    <span className="checkout-togo-bag-name">{TOGO_BAG_NAME}</span>
                    <span className="checkout-togo-bag-price">${TOGO_BAG_PRICE.toFixed(2)}</span>
                  </span>
                  <div className="qty-controls qty-controls-compact checkout-togo-bag-qty qty-stepper">
                    {togoBagQty > 0 ? (
                      <>
                        <button
                          type="button"
                          className="qty-btn qty-btn-sm"
                          onClick={() => setTogoBagQty((q) => Math.max(0, q - 1))}
                          aria-label="Fewer bags"
                        >
                          −
                        </button>
                        <span className="qty-value qty-value-sm">{togoBagQty}</span>
                        <button
                          type="button"
                          className="qty-btn qty-btn-sm qty-btn-plus"
                          onClick={() => setTogoBagQty((q) => Math.min(99, q + 1))}
                          aria-label="More bags"
                        >
                          +
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="qty-btn qty-btn-sm qty-btn-plus qty-btn-add-only"
                        onClick={() => setTogoBagQty(1)}
                        aria-label="Add bag"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              )}
              <button type="submit" className="btn-submit" disabled={loading || displayCount === 0}>
                {loading ? "Sending…" : "Submit order"}
              </button>
            </div>
          </div>
        </div>

        {isTableOrBar && (
          <p className="muted footer-hint">
            Need another round later? Scan again anytime. Questions? Ask your server.
          </p>
        )}
      </form>
    </div>
  );
}
