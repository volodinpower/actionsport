// src/api.js

// === Base URL ===
// Укажи в .env (и на Vercel): VITE_API_URL=https://api.actionsport.pro
const BASE = import.meta.env.VITE_API_URL || "";
if (import.meta.env.DEV && (!BASE || BASE.includes("fly.dev"))) {
  // Мягкое предупреждение в dev-режиме
  // eslint-disable-next-line no-console
  console.warn("[api] VITE_API_URL пуст или указывает на fly.dev. Нужен https://api.actionsport.pro");
}

// Собираем абсолютный URL
function apiUrl(path) {
  return `${BASE}${path.startsWith("/") ? path : "/" + path}`;
}

// Проверка статуса
function ok(res) {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

// Безопасный json()
async function json(res) {
  try {
    return await res.json();
  } catch {
    throw new Error("Bad JSON response");
  }
}

// fetch с таймаутом (по умолчанию 15с)
async function fetchWithTimeout(url, options = {}, ms = 15000) {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: c.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function extractError(res, fallback = "Request failed") {
  try {
    const payload = await res.json();
    if (Array.isArray(payload?.detail)) {
      return payload.detail.map((d) => d.msg || d.detail).filter(Boolean).join("; ") || fallback;
    }
    return payload?.detail || fallback;
  } catch {
    return fallback;
  }
}

// ========= AUTH (cookie-based) =========
export async function register(email, password) {
  const res = await fetchWithTimeout(apiUrl("/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await extractError(res, "Не удалось зарегистрироваться"));
  }
  return await json(res);
}

export async function login(email, password) {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetchWithTimeout(apiUrl("/auth/jwt/login"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    credentials: "include", // важно для куки
    cache: "no-store",       // страхуемся от кэша в Safari
  });
  if (res.status !== 204) {
    let msg = "Login failed";
    try {
      const j = await res.json();
      msg = j?.detail || msg;
    } catch {}
    throw new Error(msg);
  }
}

export async function logout() {
  await fetchWithTimeout(apiUrl("/auth/jwt/logout"), {
    method: "POST",
    credentials: "include",
  });
}

export async function getMe() {
  const res = await fetchWithTimeout(apiUrl("/auth/me"), { credentials: "include" });
  if (!res.ok) return null;
  return await json(res);
}

export async function updateProfile(fields) {
  const res = await fetchWithTimeout(apiUrl("/profile"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await extractError(res, "Не удалось сохранить профиль"));
  }
  return await json(res);
}

export async function fetchAddresses() {
  const res = await fetchWithTimeout(apiUrl("/profile/addresses"), { credentials: "include" });
  ok(res);
  return await json(res);
}

export async function createAddress(payload) {
  const res = await fetchWithTimeout(apiUrl("/profile/addresses"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await extractError(res, "Не удалось добавить адрес"));
  }
  return await json(res);
}

export async function updateAddress(addressId, payload) {
  const res = await fetchWithTimeout(apiUrl(`/profile/addresses/${addressId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await extractError(res, "Не удалось обновить адрес"));
  }
  return await json(res);
}

export async function deleteAddress(addressId) {
  const res = await fetchWithTimeout(apiUrl(`/profile/addresses/${addressId}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await extractError(res, "Не удалось удалить адрес"));
  }
  return await json(res);
}

export async function fetchFavorites() {
  const res = await fetchWithTimeout(apiUrl("/favorites"), { credentials: "include" });
  if (!res.ok) {
    throw new Error(await extractError(res, "Не удалось получить список избранного"));
  }
  return await json(res);
}

export async function addFavorite(productId) {
  const res = await fetchWithTimeout(apiUrl("/favorites"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: productId }),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await extractError(res, "Не удалось добавить в избранное"));
  }
  return await json(res);
}

export async function removeFavorite(productId) {
  const res = await fetchWithTimeout(apiUrl("/favorites"), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: productId }),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await extractError(res, "Не удалось удалить из избранного"));
  }
  return await json(res);
}

export async function requestVerify(email) {
  const res = await fetchWithTimeout(apiUrl("/auth/request-verify-token"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await extractError(res, "Не удалось отправить письмо"));
  }
}

export async function confirmEmail(token) {
  const res = await fetchWithTimeout(apiUrl("/auth/verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await extractError(res, "Не удалось подтвердить e-mail"));
  }
  return await json(res);
}

export async function forgotPassword(email) {
  const res = await fetchWithTimeout(apiUrl("/auth/forgot-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await extractError(res, "Не удалось отправить письмо"));
  }
}

export async function resetPassword(token, password) {
  const res = await fetchWithTimeout(apiUrl("/auth/reset-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await extractError(res, "Не удалось сменить пароль"));
  }
}

// ========= PRODUCTS =========
export async function fetchProducts(
  search = "",
  limit = 30,
  offset = 0,
  exclude = "",
  brand = "",
  sort = "asc",
  category_key = "",
  subcategory_key = "",
  gender = "",
  size = ""
) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  params.append("limit", limit);
  params.append("offset", offset);
  if (exclude) params.append("exclude", exclude);
  if (brand) params.append("brand", brand);
  if (sort) params.append("sort", sort);
  if (category_key) params.append("category_key", category_key);
  if (subcategory_key) params.append("subcategory_key", subcategory_key);
  if (gender) params.append("gender", gender);
  if (size) params.append("size", size);

  const res = await fetchWithTimeout(apiUrl(`/products?${params}`), { credentials: "include" });
  ok(res);
  return await json(res);
}

export async function fetchProductsRaw(search = "", limit = 30, offset = 0, onlyWithoutImages = false) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  params.append("limit", limit);
  params.append("offset", offset);
  if (onlyWithoutImages) params.append("only_without_images", "true");

  const res = await fetchWithTimeout(apiUrl(`/products/raw?${params}`), { credentials: "include" });
  ok(res);
  return await json(res);
}

export async function fetchProductsCount() {
  const res = await fetchWithTimeout(apiUrl("/products/count"), { credentials: "include" });
  ok(res);
  return await json(res);
}

export async function fetchProductById(id) {
  const res = await fetchWithTimeout(apiUrl(`/api/product/${id}`), { credentials: "include" });
  ok(res);
  return await json(res);
}

export async function fetchPopularProducts(limit = 20) {
  const res = await fetchWithTimeout(apiUrl(`/popular-products?limit=${limit}`), { credentials: "include" });
  ok(res);
  return await json(res);
}

export async function searchProductsForAdmin(query, limit = 20) {
  if (!query) return [];
  const params = new URLSearchParams();
  params.append("q", query);
  params.append("limit", limit);
  const res = await fetchWithTimeout(apiUrl(`/admin/products/search?${params}`), { credentials: "include" });
  ok(res);
  return await json(res);
}

export async function incrementProductView(id) {
  await fetchWithTimeout(apiUrl(`/api/product/${id}/view`), {
    method: "POST",
    credentials: "include",
  });
}

// ========= FILTERED META =========
export async function fetchFilteredBrands({ categoryKey, subcategoryKey, gender, size, search }) {
  const params = new URLSearchParams();
  if (categoryKey) params.append("category_key", categoryKey);
  if (subcategoryKey) params.append("subcategory_key", subcategoryKey);
  if (gender) params.append("gender", gender);
  if (size) params.append("size", size);
  if (search) params.append("search", search);

  const res = await fetchWithTimeout(apiUrl(`/brands/filtered?${params}`), { credentials: "include" });
  if (!res.ok) return [];
  return await json(res);
}

export async function fetchFilteredGenders({ categoryKey, subcategoryKey, brand, size, search }) {
  const params = new URLSearchParams();
  if (categoryKey) params.append("category_key", categoryKey);
  if (subcategoryKey) params.append("subcategory_key", subcategoryKey);
  if (brand) params.append("brand", brand);
  if (size) params.append("size", size);
  if (search) params.append("search", search);

  const res = await fetchWithTimeout(apiUrl(`/genders/filtered?${params}`), { credentials: "include" });
  if (!res.ok) return [];
  return await json(res);
}

export async function fetchFilteredSizes({ categoryKey, subcategoryKey, brand, gender, search }) {
  const params = new URLSearchParams();
  if (categoryKey) params.append("category_key", categoryKey);
  if (subcategoryKey) params.append("subcategory_key", subcategory_key = subcategoryKey);
  if (brand) params.append("brand", brand);
  if (gender) params.append("gender", gender);
  if (search) params.append("search", search);

  const res = await fetchWithTimeout(apiUrl(`/sizes/filtered?${params}`), { credentials: "include" });
  if (!res.ok) return [];
  return await json(res);
}

export async function fetchBrands(search = "") {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await fetchWithTimeout(apiUrl(`/brands${qs}`), { credentials: "include" });
  if (!res.ok) return [];
  return await json(res);
}

export async function fetchBrandInfoByName(name) {
  if (!name) return null;
  const params = new URLSearchParams();
  params.append("name", name);
  const res = await fetchWithTimeout(apiUrl(`/brands/info?${params.toString()}`), {
    credentials: "include",
  });
  if (!res.ok) return null;
  return await json(res);
}

export async function updateBrand(brandId, payload) {
  const res = await fetchWithTimeout(apiUrl(`/brands/${brandId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  ok(res);
  return await json(res);
}

export async function uploadBrandLogo(brandId, file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetchWithTimeout(apiUrl(`/brands/${brandId}/logo`), {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  ok(res);
  return await json(res);
}

export async function fetchInventoryMovements({ search = "", limit = 100, offset = 0 } = {}) {
  const params = new URLSearchParams();
  params.append("limit", limit);
  params.append("offset", offset);
  if (search) params.append("search", search);
  const res = await fetchWithTimeout(apiUrl(`/admin/inventory_movements?${params}`), {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await extractError(res, "Не удалось получить историю продаж"));
  }
  return await json(res);
}

export async function voidInventoryDocument(docIsn, reason = "manual") {
  const res = await fetchWithTimeout(apiUrl(`/admin/inventory_movements/${encodeURIComponent(docIsn)}/void`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await extractError(res, "Не удалось отменить документ"));
  }
  return await json(res);
}

export async function fetchCategories() {
  const res = await fetchWithTimeout(apiUrl("/categories"), { credentials: "include" });
  ok(res);
  const data = await json(res);
  return Array.isArray(data) ? data : [];
}

export async function fetchPopularBrands(limit = 18) {
  const res = await fetchWithTimeout(apiUrl(`/brands/popular?limit=${limit}`), { credentials: "include" });
  ok(res);
  return await json(res); // [{brand, count}]
}

// ========= COLLECTIONS =========
export async function fetchCollections({ featured } = {}) {
  const params = new URLSearchParams();
  if (typeof featured === "boolean") params.append("featured", String(featured));
  const res = await fetchWithTimeout(apiUrl(`/collections?${params}`), { credentials: "include" });
  ok(res);
  return await json(res);
}

export async function fetchCollection(id) {
  const res = await fetchWithTimeout(apiUrl(`/collections/${id}`), { credentials: "include" });
  ok(res);
  return await json(res);
}

export async function fetchFeaturedCollection() {
  const res = await fetchWithTimeout(apiUrl(`/collections/featured`), { credentials: "include" });
  if (res.status === 404) return null;
  ok(res);
  return await json(res);
}

export async function createCollection(data) {
  const res = await fetchWithTimeout(apiUrl(`/collections`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  ok(res);
  return await json(res);
}

export async function updateCollection(id, data) {
  const res = await fetchWithTimeout(apiUrl(`/collections/${id}`), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  ok(res);
  return await json(res);
}

export async function deleteCollection(id) {
  const res = await fetchWithTimeout(apiUrl(`/collections/${id}`), {
    method: "DELETE",
    credentials: "include",
  });
  ok(res);
  return await json(res);
}

// ========= ADMIN (superuser) =========
export async function uploadXlsx(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetchWithTimeout(apiUrl("/admin/upload_xlsx"), {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  ok(res);
  return await json(res);
}

export async function uploadProductImage(id, file, name = "") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name || "");

  const res = await fetchWithTimeout(apiUrl(`/admin/product/${id}/upload_image`), {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  ok(res);
  return await json(res);
}

export async function deleteProductImage(productId, imageUrl) {
  // Бэк ждёт относительный url вида /static/images/...
  let relativeUrl = imageUrl;
  if (relativeUrl?.startsWith("http")) {
    const idx = relativeUrl.indexOf("/static/");
    if (idx > -1) relativeUrl = relativeUrl.slice(idx);
  }

  const formData = new FormData();
  formData.append("url", relativeUrl);

  const res = await fetchWithTimeout(apiUrl(`/admin/product/${productId}/delete_image`), {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  ok(res);
  return await json(res);
}

export async function setProductImageUrl(id, imageUrl) {
  const res = await fetchWithTimeout(apiUrl(`/admin/product/${id}/set_image_url`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ image_url: imageUrl }),
  });
  ok(res);
  return await json(res);
}

export async function setProductReserved(id, reserved) {
  const res = await fetchWithTimeout(apiUrl(`/admin/product/${id}/set_reserved`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ reserved }),
  });
  ok(res);
  return await json(res);
}

export async function syncImagesForGroup(productId) {
  const res = await fetchWithTimeout(apiUrl(`/admin/product/${productId}/update_images_group`), {
    method: "POST",
    credentials: "include",
  });
  ok(res);
  return await json(res);
}

// ========= BANNERS =========
export async function fetchBanners() {
  const res = await fetchWithTimeout(apiUrl("/banners"), { credentials: "include" });
  ok(res);
  return await json(res);
}

export async function uploadBanner(imageFile, link = "", alt = "") {
  const formData = new FormData();
  formData.append("file", imageFile);
  formData.append("link", link);
  formData.append("alt", alt);

  const res = await fetchWithTimeout(apiUrl("/admin/banner/upload"), {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  ok(res);
  return await json(res);
}

export async function deleteBanner(bannerId) {
  const formData = new FormData();
  formData.append("banner_id", bannerId);

  const res = await fetchWithTimeout(apiUrl("/admin/banner/delete"), {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  ok(res);
  return await json(res);
}

// (опционально — если такая ручка есть на бэке)
export async function updateBanner(bannerId, fields) {
  const res = await fetchWithTimeout(apiUrl(`/admin/update_banner/${bannerId}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(fields),
  });
  ok(res);
  return await json(res);
}

// ========= Доп. ручки (если есть на бэке) =========
export async function fetchRandomProducts(limit = 20) {
  const res = await fetchWithTimeout(apiUrl(`/random-products?limit=${limit}`), { credentials: "include" });
  ok(res);
  return await json(res);
}
