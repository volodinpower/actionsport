// src/pages/RealAdmin.jsx
import React, { useState, useEffect, useRef } from "react";
import "./RealAdmin.css";

import {
  fetchProductsRaw,
  fetchProductsCount,
  uploadXlsx,
  uploadProductImage,
  deleteProductImage,
  fetchProductById,
  setProductReserved,
  syncImagesForGroup,
  fetchCollections,
  fetchCollection,
  createCollection,
  updateCollection,
  deleteCollection,
} from "../api";

function formatDate(date) {
  if (!date) return "";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const PRODUCTS_LIMIT = 30;
const IMAGE_CARD_SIZE = 72;

function splitImages(urls) {
  if (!urls || typeof urls !== "string") return { main: null, prev: null, full: [] };

  const arr = urls
    .split(",")
    .map((url) => url && url.trim())
    .filter(Boolean);

  const main = arr.find((u) => /_main\./i.test(u)) || null;
  const prev = arr.find((u) => /_prev\./i.test(u)) || null;
  const full = arr
    .filter((u) => /^.*_(\d+)\./i.test(u))
    .sort((a, b) => {
      const getNum = (s) => {
        const m = s.match(/_(\d+)\./);
        return m ? parseInt(m[1], 10) : 0;
      };
      return getNum(a) - getNum(b);
    });

  return { main, prev, full };
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return API_BASE + url;
  return url;
}

export default function RealAdmin() {
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(null);
  const [search, setSearch] = useState("");
  const [xlsxUploading, setXlsxUploading] = useState(false);
  const [xlsxResult, setXlsxResult] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [onlyWithoutImages, setOnlyWithoutImages] = useState(false);
  const [onlyReserve, setOnlyReserve] = useState(false); // NEW: фильтр «только в резерве»

  const [addingFullFiles, setAddingFullFiles] = useState([]);
  const [lastXlsxUpdate, setLastXlsxUpdate] = useState(() => {
    const saved = localStorage.getItem("lastXlsxUpdate");
    return saved ? new Date(saved) : null;
  });

  const listRef = useRef(null);
  const addFullInputRef = useRef(null);

  // косметика body (ничего не трогаем — избегаем «прыжков»)
  useEffect(() => {
    document.body.classList.remove("overflow-hidden", "pr-[15px]");
    return () => {
      document.body.classList.remove("overflow-hidden", "pr-[15px]");
    };
  }, []);

  // общее количество
  useEffect(() => {
    fetchProductsCount()
      .then((data) => setTotalCount(data.count))
      .catch(() => setTotalCount(null));
  }, [xlsxResult]);

  // сброс пагинации при изменениях фильтров
  useEffect(() => {
    setOffset(0);
  }, [search, xlsxResult, onlyWithoutImages, onlyReserve]); // добавили onlyReserve

  // загрузка списка (бэкенд-фильтр: только only_without_images; резерв фильтруем локально)
  useEffect(() => {
    let cancelled = false;
    fetchProductsRaw(search, PRODUCTS_LIMIT, offset, onlyWithoutImages)
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        if (offset === 0) {
          setProducts(list);
        } else {
          setProducts((prev) => {
            const prevIds = new Set(prev.map((p) => p.id));
            const uniqueNew = list.filter((p) => !prevIds.has(p.id));
            return [...prev, ...uniqueNew];
          });
        }
        setHasMore(list.length === PRODUCTS_LIMIT);
      })
      .catch((err) => alert("Ошибка получения товаров: " + err.message));
    return () => {
      cancelled = true;
    };
  }, [search, xlsxResult, offset, onlyWithoutImages]);

  // бесконечная прокрутка
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    function handleScroll() {
      if (
        el.scrollTop + el.clientHeight >= el.scrollHeight - 60 &&
        hasMore &&
        !xlsxUploading &&
        !imgUploading
      ) {
        setOffset((prev) => prev + PRODUCTS_LIMIT);
      }
    }
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [hasMore, xlsxUploading, imgUploading]);

  const loadCollectionsList = () => {
    fetchCollections()
      .then((data) => setCollections(Array.isArray(data) ? data : []))
      .catch(() => setCollections([]));
  };

  useEffect(() => {
    loadCollectionsList();
  }, []);

  useEffect(() => {
    fetchCollections()
      .then((data) => setCollections(Array.isArray(data) ? data : []))
      .catch(() => setCollections([]));
  }, [selectedCollectionId]);

  // XLSX загрузка
  const handleXlsxUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) {
      alert("Выберите файл формата .xlsx");
      return;
    }
    setXlsxUploading(true);
    try {
      const result = await uploadXlsx(file);
      setXlsxResult(result);
      const now = new Date();
      setLastXlsxUpdate(now);
      localStorage.setItem("lastXlsxUpdate", now.toISOString());
      alert(
        `Загружено:\nобновлено — ${result.updated}, добавлено — ${result.created}, удалено — ${result.deleted}`
      );
    } catch (err) {
      alert("Ошибка загрузки XLSX: " + (err?.message || err));
    } finally {
      setXlsxUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  // обновить данные редактируемого товара
  const reloadEditingProduct = async (id) => {
    try {
      const updated = await fetchProductById(id);
      setEditingProduct(updated);
    } catch {
      setEditingProduct(null);
    }
  };

  // сохранить/заменить картинку
  const saveReplaceImage = async (type, file, idx = null) => {
    if (!editingProduct || !file) return;
    setImgUploading(true);
    let name = "";
    const barcode = editingProduct.barcode || editingProduct.id || "";
    if (type === "main" || type === "prev") name = `${barcode}_${type}`;
    else if (type === "full" && idx !== null) name = `${barcode}_${idx + 1}`;

    try {
      await uploadProductImage(editingProduct.id, file, name);
      await syncImagesForGroup(editingProduct.id);
      setXlsxResult({}); // триггер перезагрузки списков
      await reloadEditingProduct(editingProduct.id);
    } catch (err) {
      alert("Ошибка сохранения: " + (err?.message || err));
    } finally {
      setImgUploading(false);
      setAddingFullFiles([]);
      if (addFullInputRef.current) {
        addFullInputRef.current.value = "";
      }
    }
  };

  // удаление картинки
  const handleDeleteImage = async (type, idx = null) => {
    if (!editingProduct) return;
    if (!window.confirm("Удалить картинку?")) return;
    setImgUploading(true);
    try {
      await deleteProductImage(editingProduct.id, type, idx);
      await syncImagesForGroup(editingProduct.id);
      setXlsxResult({});
      await reloadEditingProduct(editingProduct.id);
    } catch (err) {
      alert("Ошибка удаления: " + (err?.message || err));
    } finally {
      setImgUploading(false);
    }
  };

  // массовая загрузка full изображений
  useEffect(() => {
    const uploadFullImages = async () => {
      if (!editingProduct || !addingFullFiles.length) return;
      setImgUploading(true);
      try {
        const cur = splitImages(editingProduct.image_url).full;
        let idx = cur.length;
        const barcode = editingProduct.barcode || editingProduct.id || "";
        for (let i = 0; i < addingFullFiles.length; i++) {
          const name = `${barcode}_${idx + 1}`;
          await uploadProductImage(editingProduct.id, addingFullFiles[i], name);
          idx++;
        }
        await syncImagesForGroup(editingProduct.id);
        setXlsxResult({});
        setAddingFullFiles([]);
        await reloadEditingProduct(editingProduct.id);
      } catch (err) {
        alert("Ошибка загрузки: " + (err?.message || err));
      } finally {
        setImgUploading(false);
        if (addFullInputRef.current) addFullInputRef.current.value = "";
      }
    };
    if (addingFullFiles.length > 0) uploadFullImages();
  }, [addingFullFiles, editingProduct]);

  const handleFileChange = (type, idx, file) => {
    if (!file) return;
    setTimeout(() => saveReplaceImage(type, file, idx), 10);
  };

  const handleAddFullFile = (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setAddingFullFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const handleSetNormalMode = () => {
    setOnlyWithoutImages(false);
    setOffset(0);
  };
  const handleSetNoImagesMode = () => {
    setOnlyWithoutImages(true);
    setOffset(0);
  };
  const handleToggleReserve = () => {
    setOnlyReserve((v) => !v);
    // offset уже сбрасывается эффектом
  };

  const openEditImages = (product) => {
    setEditingProduct(product);
    setAddingFullFiles([]);
  };

  const resetCollectionForm = () => {
    setCollectionForm({ ...emptyCollection });
    setCollectionProducts([]);
    setSelectedCollectionId(null);
    setCollectionProductIdInput("");
  };

  const handleSelectCollection = async (collectionId) => {
    if (!collectionId) {
      resetCollectionForm();
      return;
    }
    setIsCollectionLoading(true);
    try {
      const data = await fetchCollection(collectionId);
      setSelectedCollectionId(collectionId);
      setCollectionForm({
        title: data.title || "",
        description: data.description || "",
        slug: data.slug || "",
        is_featured: !!data.is_featured,
        product_ids: (data.products || []).map((p) => p.id),
      });
      setCollectionProducts(Array.isArray(data.products) ? data.products : []);
    } catch (err) {
      alert("Не удалось загрузить подборку: " + (err?.message || err));
      resetCollectionForm();
    } finally {
      setIsCollectionLoading(false);
    }
  };

  const handleCollectionFieldChange = (field, value) => {
    setCollectionForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddProductToCollection = (product) => {
    if (!product) return;
    setCollectionForm((prev) => {
      if (prev.product_ids.includes(product.id)) return prev;
      return { ...prev, product_ids: [...prev.product_ids, product.id] };
    });
    setCollectionProducts((prev) => {
      if (prev.find((p) => p.id === product.id)) return prev;
      return [...prev, product];
    });
  };

  const handleRemoveProductFromCollection = (productId) => {
    setCollectionForm((prev) => ({
      ...prev,
      product_ids: prev.product_ids.filter((id) => id !== productId),
    }));
    setCollectionProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleAddProductById = async () => {
    const id = collectionProductIdInput.trim();
    if (!id) return;
    try {
      const product = await fetchProductById(id);
      handleAddProductToCollection(product);
      setCollectionProductIdInput("");
    } catch (err) {
      alert("Товар не найден: " + (err?.message || err));
    }
  };

  const handleSaveCollection = async () => {
    if (!collectionForm.title.trim()) {
      alert("Введите название подборки");
      return;
    }
    setIsCollectionLoading(true);
    try {
      const payload = {
        title: collectionForm.title.trim(),
        description: collectionForm.description || "",
        slug: collectionForm.slug || "",
        is_featured: !!collectionForm.is_featured,
        product_ids: collectionForm.product_ids,
      };
      let result;
      if (selectedCollectionId) {
        result = await updateCollection(selectedCollectionId, payload);
      } else {
        result = await createCollection(payload);
        setSelectedCollectionId(result.id);
      }
      setCollectionProducts(result.products || []);
      setCollectionForm({
        title: result.title || "",
        description: result.description || "",
        slug: result.slug || "",
        is_featured: !!result.is_featured,
        product_ids: (result.products || []).map((p) => p.id),
      });
      loadCollectionsList();
      alert("Подборка сохранена");
    } catch (err) {
      alert("Не удалось сохранить подборку: " + (err?.message || err));
    } finally {
      setIsCollectionLoading(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (!selectedCollectionId) return;
    if (!confirm("Удалить эту подборку?")) return;
    setIsCollectionLoading(true);
    try {
      await deleteCollection(selectedCollectionId);
      resetCollectionForm();
      loadCollectionsList();
    } catch (err) {
      alert("Не удалось удалить подборку: " + (err?.message || err));
    } finally {
      setIsCollectionLoading(false);
    }
  };

  const handleSyncRow = async (p) => {
    if (!confirm("Синхронизировать изображения по группе name+color для этого товара?")) return;
    try {
      await syncImagesForGroup(p.id);
      setXlsxResult({});
      if (editingProduct?.id === p.id) {
        await reloadEditingProduct(p.id);
      }
    } catch (e) {
      alert(e?.message || "Не удалось синхронизировать");
    }
  };

  // Отфильтрованный список для отображения
  const displayProducts = onlyReserve ? products.filter((p) => !!p.reserved) : products;
  const filteredProductsForCollection = collectionSearch
    ? displayProducts.filter((p) => {
        const term = collectionSearch.toLowerCase();
        return (
          p.name?.toLowerCase().includes(term) ||
          p.sitename?.toLowerCase().includes(term) ||
          p.id?.toLowerCase().includes(term)
        );
      })
    : [];

  return (
    <div className="admin-root">
      <h2 className="admin-title">Админка: загрузка каталога и картинок товаров</h2>

      <div className="admin-info">
        Всего товаров в базе: <b>{totalCount !== null ? totalCount : "..."}</b>
      </div>

      <section className="admin-section">
        <h3>Подборки товаров</h3>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ minWidth: 280, flex: "0 0 280px" }}>
            <button onClick={resetCollectionForm} style={{ marginBottom: 8 }}>
              + Новая подборка
            </button>
            <div className="admin-table-list" style={{ maxHeight: 300 }}>
              {collections.map((col) => (
                <div
                  key={col.id}
                  className={`admin-table-row ${selectedCollectionId === col.id ? "active" : ""}`}
                  style={{ gridTemplateColumns: "1fr auto" }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{col.title}</div>
                    <div style={{ fontSize: 12, color: "#555" }}>
                      товаров: {col.product_count}
                      {col.is_featured && <span style={{ color: "#e53935", marginLeft: 6 }}>на главной</span>}
                    </div>
                  </div>
                  <button onClick={() => handleSelectCollection(col.id)}>Редактировать</button>
                </div>
              ))}
              {collections.length === 0 && <div style={{ padding: 8 }}>Пока нет подборок</div>}
            </div>
          </div>

          <div style={{ flex: "1 1 400px", minWidth: 360 }}>
            {isCollectionLoading && <div>Загрузка...</div>}
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label>Название</label>
                <input
                  type="text"
                  value={collectionForm.title}
                  onChange={(e) => handleCollectionFieldChange("title", e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Slug</label>
                <input
                  type="text"
                  value={collectionForm.slug}
                  onChange={(e) => handleCollectionFieldChange("slug", e.target.value)}
                />
              </div>
            </div>
            <label>Описание</label>
            <textarea
              value={collectionForm.description}
              onChange={(e) => handleCollectionFieldChange("description", e.target.value)}
              rows={3}
              style={{ width: "100%", marginBottom: 12 }}
            />
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={collectionForm.is_featured}
                onChange={(e) => handleCollectionFieldChange("is_featured", e.target.checked)}
              />
              Показать на главной
            </label>

            <div style={{ marginTop: 16 }}>
              <button onClick={handleSaveCollection} disabled={isCollectionLoading}>
                {selectedCollectionId ? "Сохранить подборку" : "Создать подборку"}
              </button>
              {selectedCollectionId && (
                <button
                  onClick={handleDeleteCollection}
                  style={{ marginLeft: 12 }}
                  disabled={isCollectionLoading}
                >
                  Удалить
                </button>
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              <h4>Товары в подборке ({collectionProducts.length})</h4>
              {collectionProducts.length === 0 && <div style={{ fontSize: 12, color: "#777" }}>Пока пусто</div>}
              <ul style={{ maxHeight: 200, overflow: "auto", padding: 0, listStyle: "none" }}>
                {collectionProducts.map((p) => (
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
                    <button onClick={() => handleRemoveProductFromCollection(p.id)}>Удалить</button>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ marginTop: 16 }}>
              <h4>Добавить товары</h4>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="ID товара"
                  value={collectionProductIdInput}
                  onChange={(e) => setCollectionProductIdInput(e.target.value)}
                />
                <button onClick={handleAddProductById}>Добавить</button>
              </div>
              <input
                type="text"
                placeholder="Поиск по текущему списку товаров"
                value={collectionSearch}
                onChange={(e) => setCollectionSearch(e.target.value)}
              />
              {collectionSearch && (
                <div style={{ maxHeight: 180, overflow: "auto", border: "1px solid #eee", marginTop: 8 }}>
                  {filteredProductsForCollection.slice(0, 20).map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "4px 6px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      <span>{p.sitename || p.name}</span>
                      <button onClick={() => handleAddProductToCollection(p)}>Добавить</button>
                    </div>
                  ))}
                  {filteredProductsForCollection.length === 0 && (
                    <div style={{ padding: 6, fontSize: 12 }}>Ничего не найдено</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* XLSX */}
      <section className="admin-section">
        <h3>Загрузить новый XLSX-файл</h3>
        <input type="file" accept=".xlsx" onChange={handleXlsxUpload} disabled={xlsxUploading} />
        {xlsxUploading && <span>Загрузка...</span>}

        {xlsxResult && (
          <div style={{ marginTop: 10, color: "green" }}>
            Обновлено: {xlsxResult.updated}, добавлено: {xlsxResult.created}, удалено: {xlsxResult.deleted}
          </div>
        )}
        {xlsxResult && (
          <div style={{ marginTop: 18 }}>
            {Array.isArray(xlsxResult.created_rows) && xlsxResult.created_rows.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <b>Добавлено:</b>
                <div className="admin-xlsx-list admin-xlsx-added">
                  {xlsxResult.created_rows.map((row, idx) => (
                    <div key={idx}>
                      <b>{row.name}</b>{" "}
                      <span style={{ color: "#888" }}>
                        ({row.id}, {row.color}, {row.size})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(xlsxResult.deleted_rows) && xlsxResult.deleted_rows.length > 0 && (
              <div>
                <b>Удалено:</b>
                <div className="admin-xlsx-list admin-xlsx-deleted">
                  {xlsxResult.deleted_rows.map((row, idx) => (
                    <div key={idx}>
                      <b>{row.name}</b>{" "}
                      <span style={{ color: "#888" }}>
                        ({row.id}, {row.color}, {row.size})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {lastXlsxUpdate && (
          <div style={{ marginTop: 10, color: "#555", fontSize: 14 }}>
            Последнее обновление: {formatDate(lastXlsxUpdate)}
          </div>
        )}
      </section>

      {/* Режимы */}
      <div className="admin-btn-group">
        <button className={`admin-btn${!onlyWithoutImages ? " active" : ""}`} onClick={handleSetNormalMode}>
          Обычный режим
        </button>
        <button className={`admin-btn${onlyWithoutImages ? " active" : ""}`} onClick={handleSetNoImagesMode}>
          Только без картинок
        </button>
        <button className={`admin-btn${onlyReserve ? " active" : ""}`} onClick={handleToggleReserve}>
          Только в резерве
        </button>
      </div>

      {/* Таблица товаров */}
      <section className="admin-section">
        <h3>Товары (на странице: {displayProducts.length})</h3>
        <input
          type="text"
          placeholder="Поиск по товарам..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
        />
        <div ref={listRef} className="admin-table-list">
          <div className="admin-table-header">
            <div>Наименование</div>
            <div>Кол-во</div>
            <div>Резерв</div>
            <div>Цвет</div>
            <div>Размер</div>
            <div>Изображения</div>
            <div>Действия</div>
          </div>

          {displayProducts.map((p) => {
            const { main, prev, full } = splitImages(p.image_url);
            return (
              <div className="admin-table-row" key={p.id}>
                <div>
                  <b>{p.name}</b>
                </div>
                <div>{p.quantity}</div>

                <div>
                  <input
                    type="checkbox"
                    checked={!!p.reserved}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      try {
                        await setProductReserved(p.id, checked);
                        setProducts((list) =>
                          list.map((prod) => (prod.id === p.id ? { ...prod, reserved: checked } : prod))
                        );
                      } catch (err) {
                        alert("Ошибка при обновлении резерва: " + (err?.message || err));
                      }
                    }}
                    style={{ width: 18, height: 18 }}
                    title="Резервировать товар"
                  />
                </div>

                <div>{p.color}</div>
                <div>{Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes.join(", ") : p.size || "—"}</div>

                <div className="admin-imgs">
                  {main && <img src={getImageUrl(main)} alt="main" className="admin-img" />}
                  {prev && <img src={getImageUrl(prev)} alt="prev" className="admin-img" />}
                  {full.map((url, idx) => (
                    <img key={url} src={getImageUrl(url)} alt={`full${idx + 1}`} className="admin-img" />
                  ))}
                  {!main && !prev && full.length === 0 && <span style={{ color: "#aaa" }}>Нет</span>}
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <button onClick={() => openEditImages(p)}>
                    {p.image_url ? "Редактировать картинки" : "Добавить картинку"}
                  </button>
                  <button onClick={() => handleSyncRow(p)} title="Синхронизация name+color по группе">
                    Синхронизировать
                  </button>
                </div>
              </div>
            );
          })}

          {hasMore && (
            <div style={{ padding: 12, textAlign: "center", color: "#888" }}>
              Загрузка...
            </div>
          )}
        </div>
      </section>

      {/* Модалка для редактирования картинок */}
      {editingProduct && (
        <div className="admin-modal-bg" onClick={() => setEditingProduct(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Картинки товара: {editingProduct.name}</h3>

            <div style={{ display: "flex", gap: 18, marginBottom: 16 }}>
              <button
                onClick={async () => {
                  if (!confirm("Синхронизировать изображения по name+color для этого товара?")) return;
                  try {
                    await syncImagesForGroup(editingProduct.id);
                    await reloadEditingProduct(editingProduct.id);
                    setXlsxResult({});
                  } catch (e) {
                    alert(e?.message || "Не удалось синхронизировать");
                  }
                }}
              >
                Синхронизировать группу
              </button>
            </div>

            <div style={{ display: "flex", gap: 18, marginBottom: 32 }}>
              {["main", "prev"].map((type) => {
                const url = splitImages(editingProduct.image_url)[type];
                return (
                  <div key={type} className="admin-img-label">
                    <span style={{ fontWeight: 500, marginBottom: 5 }}>
                      {type === "main" ? "Main" : "Preview"}
                    </span>
                    <label className="admin-modal-label">
                      {url ? (
                        <img
                          src={getImageUrl(url)}
                          alt={type}
                          className="admin-img"
                          style={{ borderRadius: 10, border: "1px solid #aaa" }}
                        />
                      ) : (
                        <span style={{ fontSize: 36 }}>+</span>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        style={{
                          opacity: 0,
                          width: "100%",
                          height: "100%",
                          position: "absolute",
                          left: 0,
                          top: 0,
                          cursor: "pointer",
                        }}
                        onChange={(e) =>
                          handleFileChange(type, 0, e.target.files && e.target.files[0])
                        }
                        title=""
                      />
                    </label>
                    {url && (
                      <button 
                      type='button'
                      style={{ marginTop: 5, color: "#d00" }} 
                      onClick={() => handleDeleteImage(url)}>
                        Удалить
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <h3 style={{ marginTop: 24 }}>Другие картинки</h3>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                minHeight: IMAGE_CARD_SIZE,
              }}
            >
              {(() => {
                const { full } = splitImages(editingProduct.image_url);
              const blocks = full.map((url, idx) => (
                <div
                  key={url}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
                  className="admin-img-label"
                >
                  <span style={{ fontWeight: 500, fontSize: 14, marginBottom: 2 }}>
                    {`full${String(idx + 1).padStart(2, "0")}`}
                  </span>
                  <label className="admin-modal-label">
                    <img src={getImageUrl(url)} alt={`full${idx + 1}`} className="admin-img" />
                    <input
                      type="file"
                      accept="image/*"
                      style={{
                        opacity: 0,
                        width: "100%",
                        height: "100%",
                        position: "absolute",
                        left: 0,
                        top: 0,
                        cursor: "pointer",
                      }}
                      onChange={(e) =>
                        handleFileChange("full", idx, e.target.files && e.target.files[0])
                      }
                      title=""
                    />
                  </label>
                  <button
                    type="button"
                    style={{ marginTop: 3, color: "#d00", fontSize: 13 }}
                    onClick={() => handleDeleteImage(url)}
                  >
                    Удалить
                  </button>
                </div>
              ));
                if (full.length < 12) {
                  blocks.push(
                    <div key="add" className="admin-img-label">
                      <span style={{ fontWeight: 500, fontSize: 14, marginBottom: 2, color: "#888" }}>
                        {`+ Добавить full${String(full.length + 1).padStart(2, "0")}`}
                      </span>
                      <label className="admin-modal-label" style={{ border: "1px dashed #888", color: "#aaa" }}>
                        +
                        <input
                          ref={addFullInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          style={{
                            opacity: 0,
                            width: "100%",
                            height: "100%",
                            position: "absolute",
                            left: 0,
                            top: 0,
                            cursor: "pointer",
                          }}
                          onChange={handleAddFullFile}
                          title=""
                        />
                      </label>
                    </div>
                  );
                }
                return blocks;
              })()}
            </div>

            <button className="admin-modal-close" onClick={() => setEditingProduct(null)} aria-label="Close modal">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
