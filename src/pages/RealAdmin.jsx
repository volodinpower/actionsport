import React, { useState, useEffect, useRef } from "react";
import {
  fetchProductsRaw,
  fetchProductsCount,
  uploadXlsx,
  uploadProductImage,
  deleteProductImage,
  fetchProductById,
  setProductReserved,
  syncImagesForGroup,
} from "../api";

import BannerAdmin from "../components/BannerAdmin"; // импорт компонента баннеров

const PRODUCTS_LIMIT = 30;
const IMAGE_CARD_SIZE = 72;

function splitImages(urls) {
  if (!urls || typeof urls !== "string")
    return { main: null, prev: null, full: [] };
  const arr = urls
    .split(",")
    .map((url) => url && url.trim())
    .filter(Boolean);

  let main = arr.find((u) => /_main\./i.test(u)) || null;
  let prev = arr.find((u) => /_prev\./i.test(u)) || null;
  let full = arr
    .filter((u) => /^.*_(\d+)\./i.test(u))
    .sort((a, b) => {
      const getNum = (s) => {
        const m = s.match(/_(\d+)\./);
        return m ? parseInt(m[1]) : 0;
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

const RealAdmin = () => {
  // --- Товары ---
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
  const [addingFullFiles, setAddingFullFiles] = useState([]);
  const [lastXlsxUpdate, setLastXlsxUpdate] = useState(() => {
    const saved = localStorage.getItem("lastXlsxUpdate");
    return saved ? new Date(saved) : null;
  });

  const listRef = useRef(null);

  // Загрузка количества товаров
  useEffect(() => {
    fetchProductsCount()
      .then(data => setTotalCount(data.count))
      .catch(() => setTotalCount(null));
  }, [xlsxResult]);

  useEffect(() => { setOffset(0); }, [search, xlsxResult, onlyWithoutImages]);

  // Загрузка товаров (infinite scroll)
  useEffect(() => {
    fetchProductsRaw(search, PRODUCTS_LIMIT, offset, onlyWithoutImages)
      .then((data) => {
        if (offset === 0) setProducts(data);
        else setProducts((prev) => {
          const prevIds = new Set(prev.map(p => p.id));
          const uniqueNew = data.filter(p => !prevIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
        setHasMore(data.length === PRODUCTS_LIMIT);
      })
      .catch((err) => alert("Ошибка получения товаров: " + err.message));
  }, [search, xlsxResult, offset, onlyWithoutImages]);

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
  }, [hasMore, xlsxUploading, imgUploading, offset]);

  // --- XLSX upload ---
  const handleXlsxUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.match(/\.xlsx$/i)) {
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
        `Загружено: обновлено ${result.updated}, добавлено: ${result.created}, удалено: ${result.deleted}`
      );
    } catch (err) {
      alert("Ошибка загрузки XLSX: " + err.message);
    } finally {
      setXlsxUploading(false);
    }
  };

  // === Картинки ===

  const reloadEditingProduct = async (id) => {
    try {
      const updated = await fetchProductById(id);
      setEditingProduct(updated);
    } catch {
      setEditingProduct(null);
    }
  };

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
      setXlsxResult({});
      await reloadEditingProduct(editingProduct.id);
    } catch (err) {
      alert("Ошибка сохранения: " + err.message);
    } finally {
      setImgUploading(false);
    }
  };

  const handleDeleteImage = async (url) => {
    if (!editingProduct) return;
    if (!window.confirm("Удалить картинку?")) return;
    setImgUploading(true);
    try {
      await deleteProductImage(editingProduct.id, url);
      await syncImagesForGroup(editingProduct.id);
      setXlsxResult({});
      await reloadEditingProduct(editingProduct.id);
    } catch (err) {
      alert("Ошибка удаления: " + err.message);
    } finally {
      setImgUploading(false);
    }
  };

  // Массовая загрузка full-изображений с синхронизацией после
  useEffect(() => {
    const uploadFullImages = async () => {
      if (!editingProduct || !addingFullFiles.length) return;
      setImgUploading(true);
      try {
        const cur = splitImages(editingProduct.image_url).full;
        let idx = cur.length;
        const barcode = editingProduct.barcode || editingProduct.id || "";
        for (let i = 0; i < addingFullFiles.length; ++i) {
          const name = `${barcode}_${idx + 1}`;
          await uploadProductImage(editingProduct.id, addingFullFiles[i], name);
          idx++;
        }
        await syncImagesForGroup(editingProduct.id);
        setXlsxResult({});
        setAddingFullFiles([]);
        await reloadEditingProduct(editingProduct.id);
      } catch (err) {
        alert("Ошибка загрузки: " + err.message);
      } finally {
        setImgUploading(false);
      }
    };
    if (addingFullFiles.length > 0) uploadFullImages();
    // eslint-disable-next-line
  }, [addingFullFiles]);

  const handleFileChange = (type, idx, file) => {
    setTimeout(() => {
      saveReplaceImage(type, file, idx);
    }, 10);
  };

  const handleAddFullFile = (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setAddingFullFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const removeAddFullFile = (idx) => {
    setAddingFullFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSetNormalMode = () => {
    setOnlyWithoutImages(false);
    setOffset(0);
  };
  const handleSetNoImagesMode = () => {
    setOnlyWithoutImages(true);
    setOffset(0);
  };

  // --- Рендер ---

  return (
    <div style={{ width: "100vw", margin: 0, padding: 12 }}>
      <h2 style={{ marginBottom: 24 }}>Админка: загрузка каталога и картинок товаров</h2>

      {/* -------- ЗАГРУЗКА XLSX -------- */}
      <div style={{ marginBottom: 16, fontSize: 17 }}>
        Всего товаров в базе: <b>{totalCount !== null ? totalCount : "..."}</b>
      </div>
      <section style={{ marginBottom: 32 }}>
        <h3>Загрузить новый XLSX-файл</h3>
        <input
          type="file"
          accept=".xlsx"
          onChange={handleXlsxUpload}
          disabled={xlsxUploading}
        />
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
                <div style={{ maxHeight: 160, overflow: "auto", border: "1px solid #d7ffd7", background: "#f7fff7", marginTop: 4 }}>
                  {xlsxResult.created_rows.map((row, idx) => (
                    <div key={idx} style={{ fontSize: 15, padding: "2px 8px", borderBottom: "1px solid #e2ffe2" }}>
                      <b>{row.name}</b> <span style={{ color: "#888" }}>({row.id}, {row.color}, {row.size})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(xlsxResult.deleted_rows) && xlsxResult.deleted_rows.length > 0 && (
              <div>
                <b>Удалено:</b>
                <div style={{ maxHeight: 160, overflow: "auto", border: "1px solid #ffd7d7", background: "#fff7f7", marginTop: 4 }}>
                  {xlsxResult.deleted_rows.map((row, idx) => (
                    <div key={idx} style={{ fontSize: 15, padding: "2px 8px", borderBottom: "1px solid #ffe2e2" }}>
                      <b>{row.name}</b> <span style={{ color: "#888" }}>({row.id}, {row.color}, {row.size})</span>
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
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={handleSetNormalMode}
          style={{
            background: !onlyWithoutImages ? "#111" : "#fff",
            color: !onlyWithoutImages ? "#fff" : "#000",
            border: "1px solid #ccc",
            marginRight: 10,
            borderRadius: 6,
            padding: "4px 16px"
          }}
        >
          Обычный режим
        </button>
        <button
          onClick={handleSetNoImagesMode}
          style={{
            background: onlyWithoutImages ? "#111" : "#fff",
            color: onlyWithoutImages ? "#fff" : "#000",
            border: "1px solid #ccc",
            borderRadius: 6,
            padding: "4px 16px"
          }}
        >
          Только без картинок
        </button>
      </div>
      {/* -------- ТАБЛИЦА ТОВАРОВ -------- */}
      <section style={{ marginBottom: 32, width: "100%" }}>
        <h3>Товары (на странице: {products.length})</h3>
        <input
          type="text"
          placeholder="Поиск по товарам..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          style={{ width: 300, marginBottom: 12 }}
        />
        <div
          ref={listRef}
          style={{
            maxHeight: 500, overflow: "auto", border: "1px solid #eee", padding: 0,
            background: "#fff", width: "100%",
          }}
        >
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 0.1fr 0.1fr 0.4fr 0.3fr 2fr 120px",
            padding: 8,
            background: "#f9f9f9",
            borderBottom: "1px solid #eee",
            fontWeight: "bold",
            position: "sticky",
            top: 0,
            zIndex: 1,
          }}>
            <div>Наименование</div>
            <div>Кол-во</div>
            <div>Резерв</div>
            <div>Цвет</div>
            <div>Размер</div>
            <div>Изображения</div>
            <div>Действия</div>
          </div>
          {products.map((p) => {
            const { main, prev, full } = splitImages(p.image_url);
            return (
              <div key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 0.1fr 0.1fr 0.4fr 0.3fr 2fr 120px",
                  alignItems: "center",
                  borderBottom: "1px solid #eee",
                  padding: 8,
                  gap: 10,
                }}>
                <div><b>{p.name}</b></div>
                <div >{p.quantity}</div>
                <div>
                  <input
                    type="checkbox"
                    checked={!!p.reserved}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      try {
                        await setProductReserved(p.id, checked);
                        setProducts(products =>
                          products.map(prod =>
                            prod.id === p.id ? { ...prod, reserved: checked } : prod
                          )
                        );
                      } catch (err) {
                        alert("Ошибка при обновлении резерва: " + err.message);
                      }
                    }}
                    style={{ width: 18, height: 18 }}
                    title="Резервировать товар"
                  />
                </div>
                <div>{p.color}</div>
                <div>{Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes.join(", ") : (p.size || "—")}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", overflow: "hidden" }}>
                  {main && <img src={getImageUrl(main)} alt="main" style={{ width: IMAGE_CARD_SIZE, height: IMAGE_CARD_SIZE, borderRadius: 8, border: "1px solid #ccc", objectFit: "cover" }} />}
                  {prev && <img src={getImageUrl(prev)} alt="prev" style={{ width: IMAGE_CARD_SIZE, height: IMAGE_CARD_SIZE, borderRadius: 8, border: "1px solid #ccc", objectFit: "cover" }} />}
                  {full.map((url, idx) => (
                    <img key={url} src={getImageUrl(url)} alt={`full${idx + 1}`} style={{ width: IMAGE_CARD_SIZE, height: IMAGE_CARD_SIZE, borderRadius: 8, border: "1px solid #ccc", objectFit: "cover" }} />
                  ))}
                  {(!main && !prev && full.length === 0) && <span style={{ color: "#aaa" }}>Нет</span>}
                </div>
                <div>
                  <button onClick={() => openEditImages(p)}>
                    {p.image_url ? "Редактировать картинки" : "Добавить картинку"}
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
      {/* -------- МОДАЛКА КАРТИНОК ТОВАРА -------- */}
      {editingProduct && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.35)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={() => setEditingProduct(null)}>
          <div
            style={{
              background: "#fff", padding: 32, borderRadius: 10,
              minWidth: 540, maxWidth: 820, position: "relative"
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3>Картинки товара: {editingProduct.name}</h3>
            <div style={{ display: "flex", gap: 18, marginBottom: 32 }}>
              {["main", "prev"].map((type) => {
                const url = splitImages(editingProduct.image_url)[type];
                return (
                  <div key={type} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                    <span style={{ fontWeight: 500, marginBottom: 5 }}>{type === "main" ? "Main" : "Preview"}</span>
                    <label style={{
                      width: IMAGE_CARD_SIZE, height: IMAGE_CARD_SIZE, display: "flex", alignItems: "center", justifyContent: "center",
                      background: url ? "none" : "#f4f4f4", border: "1px dashed #bbb", borderRadius: 10, color: "#aaa", cursor: "pointer", position: "relative"
                    }}>
                      {url
                        ? <img src={getImageUrl(url)} alt={type} style={{
                          width: IMAGE_CARD_SIZE, height: IMAGE_CARD_SIZE, borderRadius: 10, objectFit: "cover", border: "1px solid #aaa"
                        }} />
                        : <span style={{ fontSize: 36 }}>+</span>
                      }
                      <input
                        type="file"
                        accept="image/*"
                        style={{
                          opacity: 0, width: "100%", height: "100%", position: "absolute", left: 0, top: 0, cursor: "pointer",
                        }}
                        onChange={e => handleFileChange(type, 0, e.target.files[0])}
                        title=""
                      />
                    </label>
                    {url && <button style={{ marginTop: 5, color: "#d00" }} onClick={() => handleDeleteImage(url)}>Удалить</button>}
                  </div>
                );
              })}
            </div>

            <h3 style={{ marginTop: 24 }}>Другие картинки</h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", minHeight: IMAGE_CARD_SIZE }}>
              {(() => {
                const { full } = splitImages(editingProduct.image_url);
                let fullBlocks = full.map((url, idx) => (
                  <div key={url} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                    <span style={{ fontWeight: 500, fontSize: 14, marginBottom: 2 }}>{`full${String(idx + 1).padStart(2, "0")}`}</span>
                    <label style={{
                      width: IMAGE_CARD_SIZE, height: IMAGE_CARD_SIZE, borderRadius: 8, border: "1px solid #bbb", display: "flex",
                      alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative"
                    }}>
                      <img src={getImageUrl(url)} alt={`full${idx + 1}`} style={{ width: IMAGE_CARD_SIZE, height: IMAGE_CARD_SIZE, borderRadius: 8, objectFit: "cover" }} />
                      <input
                        type="file"
                        accept="image/*"
                        style={{
                          opacity: 0, width: "100%", height: "100%", position: "absolute", left: 0, top: 0, cursor: "pointer",
                        }}
                        onChange={e => handleFileChange("full", idx, e.target.files[0])}
                        title=""
                      />
                    </label>
                    <button style={{ marginTop: 3, color: "#d00", fontSize: 13 }} onClick={() => handleDeleteImage(url)}>Удалить</button>
                  </div>
                ));
                if (full.length < 12) {
                  fullBlocks.push(
                    <div key="add" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ fontWeight: 500, fontSize: 14, marginBottom: 2, color: "#888" }}>{`+ Добавить full${String(full.length + 1).padStart(2, "0")}`}</span>
                      <label style={{
                        width: IMAGE_CARD_SIZE, height: IMAGE_CARD_SIZE, border: "1px dashed #888", borderRadius: 8, color: "#aaa",
                        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative"
                      }}>
                        +
                        <input type="file" accept="image/*" multiple style={{
                          opacity: 0, width: "100%", height: "100%", position: "absolute", left: 0, top: 0, cursor: "pointer"
                        }} onChange={handleAddFullFile} title="" />
                      </label>
                    </div>
                  );
                }
                return fullBlocks;
              })()}
            </div>
            <button onClick={() => setEditingProduct(null)} style={{ position: "absolute", top: 8, right: 8, fontSize: 22, background: "none", border: "none" }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealAdmin;
