import React, { useEffect, useState } from "react";
import { fetchInventoryMovements } from "../api";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ru-RU");
  } catch {
    return value;
  }
}

export default function InventoryMovementsAdmin() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchInventoryMovements({ search, limit: 200 });
        if (!cancelled) {
          setItems(data.items || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Не удалось загрузить историю");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [search]);

  function handleSubmit(e) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <section style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 6px rgba(0,0,0,0.06)" }}>
      <header style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>История продаж и возвратов</h2>
        <span style={{ color: "#999", fontSize: 13 }}>Всего записей: {total}</span>
        <form onSubmit={handleSubmit} style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Поиск по товару, цвету, штрихкоду или документу"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              minWidth: 320,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Найти
          </button>
        </form>
      </header>

      {error && (
        <div style={{ marginBottom: 12, color: "#c00", fontWeight: 500 }}>{error}</div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
              <th style={{ padding: "8px 6px" }}>Дата</th>
              <th style={{ padding: "8px 6px" }}>Товар</th>
              <th style={{ padding: "8px 6px" }}>Цвет/Размер</th>
              <th style={{ padding: "8px 6px" }}>Δ кол-во</th>
              <th style={{ padding: "8px 6px" }}>Документы</th>
              <th style={{ padding: "8px 6px" }}>Тип</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#888" }}>
                  Нет записей
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>{formatDate(item.created_at)}</td>
                <td style={{ padding: "8px 6px" }}>
                  <div style={{ fontWeight: 600 }}>{item.product_name || item.product_id || "—"}</div>
                  <div style={{ color: "#888", fontSize: 12 }}>{item.barcode || item.item_code || "—"}</div>
                </td>
                <td style={{ padding: "8px 6px" }}>{item.product_color || "—"}</td>
                <td style={{ padding: "8px 6px", fontWeight: 600, color: item.quantity_delta < 0 ? "#d00" : "#0a0" }}>
                  {item.quantity_delta > 0 ? `+${item.quantity_delta}` : item.quantity_delta}
                </td>
                <td style={{ padding: "8px 6px" }}>
                  {(item.doc_numbers || []).length > 0 ? item.doc_numbers.join(", ") : "—"}
                </td>
                <td style={{ padding: "8px 6px" }}>
                  {item.doc_type || "—"}
                  {item.doc_date && (
                    <div style={{ color: "#888", fontSize: 12 }}>{formatDate(item.doc_date)}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && (
        <div style={{ marginTop: 12, color: "#555", fontSize: 13 }}>Загрузка...</div>
      )}
    </section>
  );
}
