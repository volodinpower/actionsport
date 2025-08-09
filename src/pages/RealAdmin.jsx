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
  if (!urls || typeof urls !== "string")
    return { main: null, prev: null, full: [] };

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

const RealAdmin = () => {
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [xlsxUploading, setXlsxUploading] = useState(false);
  const [xlsxResult, setXlsxResult] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [onlyWithoutImages, setOnlyWithoutImages] = useState(false);
  const [addingFullFiles, setAddingFullFiles] = useState<File[]>([]);
  const [lastXlsxUpdate, setLastXlsxUpdate] = useState<Date | null>(() => {
    const saved = localStorage.getItem("lastXlsxUpdate");
    return saved ? new Date(saved) : null;
  });

  const listRef = useRef<HTMLDivElement | null>(null);
  const addFullInputRef = useRef<HTMLInputElement | null>(null);

  // косметика body
  useEffect(() => {
    document.body.style.paddingRight = "";
    document.body.style.overflow = "";
    document.body.style.marginRight = "";
    document.body.classList.remove("overflow-hidden", "pr-[15px]");
    return () => {
      document.body.style.paddingRight = "";
      document.body.style.overflow = "";
      document.body.style.marginRight = "";
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
  }, [search, xlsxResult, onlyWithoutImages]);

  // загрузка списка
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

  // XLSX загрузка
  const handleXlsxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
    } catch (err: any) {
      alert("Ошибка загрузки XLSX: " + (err?.message || err));
    } finally {
      setXlsxUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  // обновить данные редактируемого товара
  const reloadEditingProduct = async (id: string) => {
    try {
      const updated = await fetchProductById(id);
      setEditingProduct(updated);
    } catch {
      setEditingProduct(null);
    }
  };

  // сохранить/заменить картинку
  const saveReplaceImage = async (type: "main" | "prev" | "full", file: File, idx: number | null = null) => {
    if (!editingProduct || !file) return;
    setImgUploading(true);
    let name = "";
    const barcode = editingProduct.barcode || editingProduct.id || "";
    if (type === "main" || type === "prev") name = `${barcode}_${type}`;
    else if (type === "full" && idx !== null) name = `${barcode}_${idx + 1}`;

    try {
      await uploadProductImage(editingProduct.id, file, name);
      await syncImagesForGroup(editingProduct.id);
      setXlsxResult({}); // триггерим перезагрузку списков
      await reloadEditingProduct(editingProduct.id);
    } catch (err: any) {
      alert("Ошибка сохранения: " + (err?.message || err));
    } finally {
      setImgUploading(false);
    }
  };

  // удаление картинки
  const handleDeleteImage = async (url: string) => {
    if (!editingProduct) return;
    if (!window.confirm("Удалить картинку?")) return;
    setImgUploading(true);
    try {
      await deleteProductImage(editingProduct.id, url);
      await syncImagesForGroup(editingProduct.id);
      setXlsxResult({});
      await reloadEditingProduct(editingProduct.id);
    } catch (err: any) {
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
      } catch (err: any) {
        alert("Ошибка загрузки: " + (err?.message || err));
      } finally {
        setImgUploading(false);
        if (addFullInputRef.current) addFullInputRef.current.value = "";
      }
    };
    if (addingFullFiles.length > 0) uploadFullImages();
  }, [addingFullFiles, editingProduct]);

  const handleFileChange = (type: "main" | "prev" | "full", idx: number, file?: File) => {
    if (!file) return;
    // небольшая задержка, чтобы input успел отпуститься
    setTimeout(() => saveReplaceImage(type, file, idx), 10);
  };

  const handleAddFullFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const openEditImages = (product: any) => {
    setEditingProduct(product);
    setAddingFullFiles([]);
  };

  const handleSyncRow = async (p: any) => {
    if (!confirm("Синхронизировать изображения по группе name+color для этого товара?")) return;
    try {
      await syncImagesForGroup(p.id);
      setXlsxResult({});
      if (editingProduct?.id === p.id) {
        await reloadEditingProduct(p.id);
      }
    } catch (e: any) {
      alert(e?.message || "Не удалось синхронизировать");
    }
  };

  return (
    <div className="admin-root">
      <h2 className="admin-title">Админка: загрузка каталога и картинок товаров</h2>

      <div className="admin-info">
        Всего товаров в базе: <b>{totalCount !== null ? totalCount : "..."}</b>
      </div>

      {/* XLSX */}
      <section className="admin-section">
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
                <div className="admin-xlsx-list admin-xlsx-added">
                  {xlsxResult.created_rows.map((row: any, idx: number) => (
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
                  {xlsxResult.deleted_rows.map((row: any, idx: number) => (
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
        <button
          className={`admin-btn${!onlyWithoutImages ? " active" : ""}`}
          onClick={handleSetNormalMode}
        >
          Обычный режим
        </button>
        <button
          className={`admin-btn${onlyWithoutImages ? " active" : ""}`}
          onClick={handleSetNoImagesMode}
        >
          Только без картинок
        </button>
      </div>

      {/* Таблица товаров */}
      <section className="admin-section">
        <h3>Товары (на странице: {products.length})</h3>
        <input
          type="text"
          placeholder="Поиск по товарам..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          style={{ width: 300, marginBottom: 12 }}
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

          {products.map((p: any) => {
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
                          list.map((prod) =>
                            prod.id === p.id ? { ...prod, reserved: checked } : prod
                          )
                        );
                      } catch (err: any) {
                        alert("Ошибка при обновлении резерва: " + (err?.message || err));
                      }
                    }}
                    style={{ width: 18, height: 18 }}
                    title="Резервировать товар"
                  />
                </div>

                <div>{p.color}</div>
                <div>
                  {Array.isArray(p.sizes) && p.sizes.length > 0
                    ? p.sizes.join(", ")
                    : p.size || "—"}
                </div>

                <div className="admin-imgs">
                  {main && (
                    <img src={getImageUrl(main)} alt="main" className="admin-img" />
                  )}
                  {prev && (
                    <img src={getImageUrl(prev)} alt="prev" className="admin-img" />
                  )}
                  {full.map((url, idx) => (
                    <img key={url} src={getImageUrl(url)} alt={`full${idx + 1}`} className="admin-img" />
                  ))}
                  {!main && !prev && full.length === 0 && (
                    <span style={{ color: "#aaa" }}>Нет</span>
                  )}
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
                  } catch (e: any) {
                    alert(e?.message || "Не удалось синхронизировать");
                  }
                }}
              >
                Синхронизировать группу
              </button>
            </div>

            <div style={{ display: "flex", gap: 18, marginBottom: 32 }}>
              {["main", "prev"].map((type) => {
                const url = splitImages(editingProduct.image_url)[type as "main" | "prev"];
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
                          handleFileChange(type as "main" | "prev", 0, e.target.files?.[0])
                        }
                        title=""
                      />
                    </label>
                    {url && (
                      <button
                        style={{ marginTop: 5, color: "#d00" }}
                        onClick={() => handleDeleteImage(url)}
                      >
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
                  <div key={url} className="admin-img-label">
                    <span
                      style={{
                        fontWeight: 500,
                        fontSize: 14,
                        marginBottom: 2,
                      }}
                    >
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
                          handleFileChange("full", idx, e.target.files?.[0])
                        }
                        title=""
                      />
                    </label>
                    <button
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
                      <span
                        style={{
                          fontWeight: 500,
                          fontSize: 14,
                          marginBottom: 2,
                          color: "#888",
                        }}
                      >
                        {`+ Добавить full${String(full.length + 1).padStart(2, "0")}`}
                      </span>
                      <label
                        className="admin-modal-label"
                        style={{ border: "1px dashed #888", color: "#aaa" }}
                      >
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

            <button
              className="admin-modal-close"
              onClick={() => setEditingProduct(null)}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealAdmin;
