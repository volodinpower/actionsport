import { useEffect, useState } from "react";
import "../pages/RealAdmin.css";
import {
  fetchCollections,
  fetchCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  fetchProductById,
  searchProductsForAdmin,
} from "../api";

const EMPTY_FORM = {
  title: "",
  description: "",
  slug: "",
  is_featured: false,
  product_ids: [],
};

export default function CollectionsAdmin() {
  const [collections, setCollections] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [products, setProducts] = useState([]);
  const [productIdInput, setProductIdInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadCollections = () => {
    fetchCollections()
      .then(res => setCollections(Array.isArray(res) ? res : []))
      .catch(() => setCollections([]));
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setProducts([]);
    setSelectedId(null);
    setProductIdInput("");
  };

  const handleSelect = async (collectionId) => {
    if (!collectionId) {
      resetForm();
      return;
    }
    setLoading(true);
    try {
      const data = await fetchCollection(collectionId);
      setSelectedId(collectionId);
      setForm({
        title: data.title || "",
        description: data.description || "",
        slug: data.slug || "",
        is_featured: !!data.is_featured,
        product_ids: (data.products || []).map(p => p.id),
      });
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (err) {
      alert("Не удалось загрузить подборку: " + (err?.message || err));
      resetForm();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddProduct = (product) => {
    if (!product || !product.id) return;
    if (form.product_ids.includes(product.id)) {
      alert("Товар уже добавлен");
      return;
    }
    setForm(prev => ({ ...prev, product_ids: [...prev.product_ids, product.id] }));
    setProducts(prev => [...prev, product]);
  };

  const handleAddProductById = async () => {
    const id = productIdInput.trim();
    if (!id) return;
    try {
      const product = await fetchProductById(id);
      handleAddProduct(product);
      setProductIdInput("");
    } catch (err) {
      alert("Товар не найден: " + (err?.message || err));
    }
  };

  const handleRemoveProduct = (productId) => {
    setForm(prev => ({
      ...prev,
      product_ids: prev.product_ids.filter(id => id !== productId),
    }));
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert("Название обязательно");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || "",
        slug: form.slug || "",
        is_featured: !!form.is_featured,
        product_ids: form.product_ids,
      };
      let result;
      if (selectedId) {
        result = await updateCollection(selectedId, payload);
      } else {
        result = await createCollection(payload);
        setSelectedId(result.id);
      }
      setProducts(result.products || []);
      setForm({
        title: result.title || "",
        description: result.description || "",
        slug: result.slug || "",
        is_featured: !!result.is_featured,
        product_ids: (result.products || []).map(p => p.id),
      });
      loadCollections();
      alert("Подборка сохранена");
    } catch (err) {
      alert("Не удалось сохранить подборку: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm("Удалить подборку?")) return;
    setLoading(true);
    try {
      await deleteCollection(selectedId);
      resetForm();
      loadCollections();
    } catch (err) {
      alert("Не удалось удалить подборку: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      setSearchLoading(true);
      searchProductsForAdmin(searchTerm.trim(), 15)
        .then(res => {
          if (!cancelled) setSearchResults(Array.isArray(res) ? res : []);
        })
        .catch(() => !cancelled && setSearchResults([]))
        .finally(() => !cancelled && setSearchLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchTerm]);

  return (
    <div className="admin-root">
    <section className="admin-section collections-admin">
      <h3>Подборки товаров</h3>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div style={{ minWidth: 280, flex: "0 0 280px" }}>
          <button onClick={resetForm} style={{ marginBottom: 8 }}>
            + Новая подборка
          </button>
          <div className="admin-table-list" style={{ maxHeight: 320 }}>
            {collections.map(col => (
              <div
                key={col.id}
                className={`admin-table-row ${selectedId === col.id ? "active" : ""}`}
                style={{ gridTemplateColumns: "1fr auto" }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{col.title}</div>
                  <div style={{ fontSize: 12, color: "#555" }}>
                    товаров: {col.product_count}
                    {col.is_featured && (
                      <span style={{ color: "#e53935", marginLeft: 6 }}>на главной</span>
                    )}
                  </div>
                </div>
                <button onClick={() => handleSelect(col.id)}>Редактировать</button>
              </div>
            ))}
            {collections.length === 0 && <div style={{ padding: 8 }}>Пока нет подборок</div>}
          </div>
        </div>

        <div style={{ flex: "1 1 420px", minWidth: 360 }}>
          {loading && <div>Загрузка...</div>}
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label>Название</label>
              <input
                type="text"
                value={form.title}
                onChange={e => handleUpdateField("title", e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={e => handleUpdateField("slug", e.target.value)}
              />
            </div>
          </div>
          <label>Описание</label>
          <textarea
            value={form.description}
            onChange={e => handleUpdateField("description", e.target.value)}
            rows={3}
            style={{ width: "100%", marginBottom: 12 }}
          />
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={e => handleUpdateField("is_featured", e.target.checked)}
            />
            Показать на главной
          </label>

          <div style={{ marginTop: 16 }}>
            <button onClick={handleSave} disabled={loading}>
              {selectedId ? "Сохранить" : "Создать"}
            </button>
            {selectedId && (
              <button style={{ marginLeft: 12 }} onClick={handleDelete} disabled={loading}>
                Удалить
              </button>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <h4>Товары ({products.length})</h4>
            {products.length === 0 && <div style={{ fontSize: 12, color: "#777" }}>Пусто</div>}
            <ul style={{ maxHeight: 220, overflow: "auto", padding: 0, listStyle: "none" }}>
              {products.map(p => (
                <li
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "4px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <span>{p.sitename || p.name}</span>
                  <button onClick={() => handleRemoveProduct(p.id)}>Удалить</button>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: 16 }}>
            <h4>Добавить товар по ID</h4>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={productIdInput}
                placeholder="ID товара"
                onChange={e => setProductIdInput(e.target.value)}
              />
              <button onClick={handleAddProductById}>Добавить</button>
            </div>
            <h4 style={{ marginTop: 12 }}>Или поиск по названию</h4>
            <input
              type="text"
              placeholder="Введите часть названия"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <div style={{ border: "1px solid #eee", maxHeight: 180, overflow: "auto", marginTop: 8 }}>
                {searchLoading && <div style={{ padding: 6 }}>Поиск…</div>}
                {!searchLoading && searchResults.length === 0 && (
                  <div style={{ padding: 6, fontSize: 12 }}>Ничего не найдено</div>
                )}
                {searchResults.map(item => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 6px",
                      borderBottom: "1px solid #f3f3f3",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{item.sitename || item.name}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>{item.id}</div>
                    </div>
                    <button onClick={() => handleAddProduct(item)}>Добавить</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
    </div>
  );
}
