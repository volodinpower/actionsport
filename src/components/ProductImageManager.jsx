import React, { useState, useEffect } from "react";
import {
  fetchProductById,
  uploadProductImage,
  deleteProductImage,
  syncImagesForGroup,
} from "../api";

const IMAGE_CARD_SIZE = 72;

function splitImages(urls) {
  if (!urls || typeof urls !== "string") return { main: null, prev: null, full: [] };
  const arr = urls.split(",").map(u => u.trim()).filter(Boolean);
  const main = arr.find(u => /_main\./i.test(u)) || null;
  const prev = arr.find(u => /_prev\./i.test(u)) || null;
  const full = arr.filter(u => /^.*_(\d+)\./i.test(u)).sort((a, b) => {
    const getNum = s => {
      const m = s.match(/_(\d+)\./);
      return m ? parseInt(m[1]) : 0;
    };
    return getNum(a) - getNum(b);
  });
  return { main, prev, full };
}

export default function ProductImageManager({ productId }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  // Загрузка товара с сервера
  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await fetchProductById(productId);
      setProduct(data);
    } catch (err) {
      alert("Ошибка загрузки товара: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [productId]);

  if (!product) return <div>Загрузка данных товара...</div>;

  const { main, prev, full } = splitImages(product.image_url);

  // Загрузка картинки (тип: main, prev, full + индекс для full)
  const handleFileChange = async (type, idx, file) => {
    if (!file) return;
    setLoading(true);
    try {
      let name = "";
      const barcode = product.barcode || product.id || "";
      if (type === "main" || type === "prev") {
        name = `${barcode}_${type}`;
      } else if (type === "full" && idx !== null) {
        name = `${barcode}_${idx + 1}`;
      }
      await uploadProductImage(product.id, file, name);
      await syncImagesForGroup(product.id);
      await loadProduct();
      alert("Картинка загружена");
    } catch (err) {
      alert("Ошибка загрузки картинки: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Удаление картинки
  const handleDelete = async (url) => {
    if (!window.confirm("Удалить эту картинку?")) return;
    setLoading(true);
    try {
      await deleteProductImage(product.id, url);
      await syncImagesForGroup(product.id);
      await loadProduct();
      alert("Картинка удалена");
    } catch (err) {
      alert("Ошибка удаления картинки: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Изображения товара: {product.name}</h3>
      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        {/* Main и Prev */}
        {["main", "prev"].map((type) => {
          const url = type === "main" ? main : prev;
          return (
            <div key={type} style={{ textAlign: "center" }}>
              <div>{type.toUpperCase()}</div>
              <label
                style={{
                  display: "inline-block",
                  width: IMAGE_CARD_SIZE,
                  height: IMAGE_CARD_SIZE,
                  borderRadius: 10,
                  border: url ? "1px solid #444" : "2px dashed #aaa",
                  cursor: "pointer",
                  position: "relative",
                  backgroundColor: url ? "transparent" : "#f0f0f0",
                }}
              >
                {url ? (
                  <img
                    src={url.startsWith("http") ? url : `${import.meta.env.VITE_API_URL}${url}`}
                    alt={type}
                    style={{ width: "100%", height: "100%", borderRadius: 10, objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ lineHeight: IMAGE_CARD_SIZE + "px", color: "#aaa", fontSize: 24 }}>+</div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  style={{
                    opacity: 0,
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    cursor: "pointer",
                  }}
                  onChange={(e) => handleFileChange(type, 0, e.target.files[0])}
                  disabled={loading}
                />
              </label>
              {url && (
                <button
                  onClick={() => handleDelete(url)}
                  disabled={loading}
                  style={{ display: "block", marginTop: 6, color: "red", cursor: "pointer" }}
                >
                  Удалить
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Full images */}
      <h4>Full images</h4>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {full.map((url, idx) => (
          <div key={url} style={{ textAlign: "center", position: "relative" }}>
            <div>{`Full ${idx + 1}`}</div>
            <label
              style={{
                display: "inline-block",
                width: IMAGE_CARD_SIZE,
                height: IMAGE_CARD_SIZE,
                borderRadius: 8,
                border: "1px solid #444",
                cursor: "pointer",
                position: "relative",
              }}
            >
              <img
                src={url.startsWith("http") ? url : `${import.meta.env.VITE_API_URL}${url}`}
                alt={`full${idx + 1}`}
                style={{ width: "100%", height: "100%", borderRadius: 8, objectFit: "cover" }}
              />
              <input
                type="file"
                accept="image/*"
                style={{
                  opacity: 0,
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "100%",
                  height: "100%",
                  cursor: "pointer",
                }}
                onChange={(e) => handleFileChange("full", idx, e.target.files[0])}
                disabled={loading}
              />
            </label>
            <button
              onClick={() => handleDelete(url)}
              disabled={loading}
              style={{ display: "block", marginTop: 6, color: "red", cursor: "pointer" }}
            >
              Удалить
            </button>
          </div>
        ))}
        {/* Добавление новых full изображений */}
        {full.length < 12 && (
          <div style={{ textAlign: "center" }}>
            <div>{`+ Добавить full ${full.length + 1}`}</div>
            <label
              style={{
                display: "inline-block",
                width: IMAGE_CARD_SIZE,
                height: IMAGE_CARD_SIZE,
                borderRadius: 8,
                border: "2px dashed #888",
                color: "#aaa",
                cursor: "pointer",
                lineHeight: IMAGE_CARD_SIZE + "px",
                fontSize: 30,
                userSelect: "none",
              }}
            >
              +
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ opacity: 0, position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}
                onChange={async (e) => {
                  if (!e.target.files.length) return;
                  setLoading(true);
                  try {
                    const barcode = product.barcode || product.id || "";
                    let idxStart = full.length;
                    for (let i = 0; i < e.target.files.length; i++) {
                      const name = `${barcode}_${idxStart + 1}`;
                      await uploadProductImage(product.id, e.target.files[i], name);
                      idxStart++;
                    }
                    await syncImagesForGroup(product.id);
                    await loadProduct();
                    alert("Картинки добавлены");
                  } catch (err) {
                    alert("Ошибка загрузки картинок: " + err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              />
            </label>
          </div>
        )}
      </div>

      {loading && <div style={{ marginTop: 20 }}>Загрузка...</div>}
    </div>
  );
}
