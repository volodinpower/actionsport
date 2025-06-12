// src/api.js

function getAdminToken() {
  return localStorage.getItem("admin_token");
}

// Вспомогательная функция для формирования полного URL
function apiUrl(path) {
  const base = import.meta.env.VITE_API_URL || "";
  return `${base}${path.startsWith("/") ? path : "/" + path}`;
}

// --- Синхронизировать картинки по группе (по name и color) ---
export async function syncImagesForGroup(productId) {
  const token = getAdminToken();
  const res = await fetch(apiUrl(`/admin/product/${productId}/update_images_group`), {
    method: "POST",
    headers: token ? { Authorization: "Bearer " + token } : {},
  });
  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.reload();
    throw new Error("Авторизация истекла, войдите заново");
  }
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// --- Получить список товаров с фильтрацией (поиск, лимит, смещение, фильтр по отсутствию картинок)
export async function fetchProducts(search = "", limit = 30, offset = 0, exclude = "", brand = "", sort = "asc") {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  params.append("limit", limit);
  params.append("offset", offset);
  if (exclude) params.append("exclude", exclude);
  if (brand) params.append("brand", brand);
  if (sort) params.append("sort", sort);
  const res = await fetch(apiUrl(`/products?${params}`));
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// --- Получить случайные товары с картинками для главной страницы
export async function fetchRandomProducts(limit = 20) {
  const res = await fetch(apiUrl(`/random-products?limit=${limit}`));
  if (!res.ok) throw new Error("Failed to fetch random products");
  return await res.json();
}

// --- Загрузить CSV (используется для теста или отладки, основной импорт — XLSX)
export async function uploadCsv(file) {
  const formData = new FormData();
  formData.append("file", file);
  const token = getAdminToken();
  const res = await fetch(apiUrl("/admin/upload_csv"), {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: "Bearer " + token } : {},
  });
  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.reload();
    throw new Error("Авторизация истекла, войдите заново");
  }
  if (!res.ok) throw new Error("Failed to upload CSV");
  return await res.json();
}

// --- Загрузить XLSX (основной импорт каталога)
export async function uploadXlsx(file) {
  const formData = new FormData();
  formData.append("file", file);
  const token = getAdminToken();
  const res = await fetch(apiUrl("/admin/upload_xlsx"), {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: "Bearer " + token } : {},
  });
  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.reload();
    throw new Error("Авторизация истекла, войдите заново");
  }
  if (!res.ok) throw new Error("Failed to upload XLSX");
  return await res.json();
}

// --- Получить данные одного товара по id (подробно для модалки/деталей)
export async function fetchProductById(id) {
  const res = await fetch(apiUrl(`/api/product/${id}`));
  if (!res.ok) throw new Error("Failed to fetch product");
  return await res.json();
}

// --- Установить ссылку на картинку для товара (вручную, если нужно)
export async function setProductImageUrl(id, imageUrl) {
  const token = getAdminToken();
  const res = await fetch(apiUrl(`/admin/product/${id}/set_image_url`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify({ image_url: imageUrl }),
  });
  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.reload();
    throw new Error("Авторизация истекла, войдите заново");
  }
  if (!res.ok) throw new Error("Failed to update image URL");
  return await res.json();
}

// --- Загрузить картинку для товара (с поддержкой name: _main, _prev, _1, _2 ...)
export async function uploadProductImage(id, file, name = "") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name || "");
  const token = getAdminToken();
  const res = await fetch(apiUrl(`/admin/product/${id}/upload_image`), {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: "Bearer " + token } : {},
  });
  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.reload();
    throw new Error("Авторизация истекла, войдите заново");
  }
  if (!res.ok) throw new Error("Failed to upload image");
  return await res.json();
}

// --- Удалить картинку у товара (отправлять FormData, иначе FastAPI не примет)
export async function deleteProductImage(productId, imageUrl) {
  const formData = new FormData();
  formData.append("url", imageUrl);  // <-- вот здесь
  const token = getAdminToken();
  const res = await fetch(apiUrl(`/admin/product/${productId}/delete_image`), {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: "Bearer " + token } : {},
  });
  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.reload();
    throw new Error("Авторизация истекла, войдите заново");
  }
  if (!res.ok) throw new Error("Ошибка удаления");
  return await res.json();
}


// --- Получить отчёт после загрузки XLSX (по сути дублирует uploadXlsx, оставь если хочешь как алиас)
export async function getXlsxImportReport(file) {
  return await uploadXlsx(file);
}

// --- Получить подробную инфу о товаре (например, для карточки, если потребуется)
export async function fetchProductDetails(id) {
  return await fetchProductById(id);
}

// --- Получить товары без картинок (отдельно, если понадобится в админке)
export async function fetchProductsWithoutImages(limit = 30, offset = 0) {
  return await fetchProducts("", limit, offset, true);
}

// Получить общее количество товаров в базе
export async function fetchProductsCount() {
  const res = await fetch(apiUrl("/products/count"));
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// --- Получить "сырые" товары для админки (без группировки)
export async function fetchProductsRaw(search = "", limit = 30, offset = 0, onlyWithoutImages = false) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  params.append("limit", limit);
  params.append("offset", offset);
  if (onlyWithoutImages) params.append("only_without_images", "true");
  const res = await fetch(apiUrl(`/products/raw?${params}`));
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// --- Получить список брендов для меню ---
export async function fetchBrands() {
  const res = await fetch(apiUrl("/brands"));
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// --- Получить баннеры для главной страницы ---
export async function fetchBanners() {
  const res = await fetch(apiUrl("/banners"));
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// --- Загрузить новый баннер (image — файл, link — ссылка на страницу, alt — alt-текст) ---
export async function uploadBanner(imageFile, link = "", alt = "") {
  const formData = new FormData();
  formData.append("file", imageFile);
  formData.append("link", link);
  formData.append("alt", alt);
  const token = getAdminToken();
  const res = await fetch(apiUrl("/admin/banner/upload"), {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: "Bearer " + token } : {},
  });
  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.reload();
    throw new Error("Авторизация истекла, войдите заново");
  }
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// --- Удалить баннер по id ---
export async function deleteBanner(bannerId) {
  const formData = new FormData();
  formData.append("banner_id", bannerId);
  const token = getAdminToken();
  const res = await fetch(apiUrl("/admin/banner/delete"), {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: "Bearer " + token } : {},
  });
  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.reload();
    throw new Error("Авторизация истекла, войдите заново");
  }
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function updateBanner(bannerId, fields) {
  // fields: { link, alt }
  const token = getAdminToken();
  const res = await fetch(apiUrl(`/admin/update_banner/${bannerId}`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify(fields)
  });
  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.reload();
    throw new Error("Авторизация истекла, войдите заново");
  }
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function setProductReserved(id, reserved) {
  const token = getAdminToken();
  const res = await fetch(apiUrl(`/admin/product/${id}/set_reserved`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify({ reserved })
  });
  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.reload();
    throw new Error("Авторизация истекла, войдите заново");
  }
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function fetchPopularProducts(limit = 20) {
  const res = await fetch(apiUrl(`/popular-products?limit=${limit}`));
  if (!res.ok) throw new Error("Failed to fetch popular products");
  return await res.json();
}

export async function incrementProductView(id) {
  await fetch(apiUrl(`/api/product/${id}/view`), {
    method: "POST",
  });
}

// --- Экспортировать всё одной структурой (если захочешь использовать import * as api from "./api")
export default {
  fetchProducts,
  fetchRandomProducts,
  uploadCsv,
  uploadXlsx,
  fetchProductById,
  setProductImageUrl,
  uploadProductImage,
  deleteProductImage,
  getXlsxImportReport,
  fetchProductDetails,
  fetchProductsWithoutImages,
  fetchProductsCount,
  fetchProductsRaw,
  fetchBrands,
  fetchBanners,
  uploadBanner,
  deleteBanner,
  updateBanner,
  setProductReserved,
  syncImagesForGroup,
};
