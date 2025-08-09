// src/api.js

function apiUrl(path) {
  const base = import.meta.env.VITE_API_URL || "";
  return `${base}${path.startsWith("/") ? path : "/" + path}`;
}

function ok(res) {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

// ========= AUTH (cookie-based) =========
export async function login(email, password) {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(apiUrl("/auth/jwt/login"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    credentials: "include", // важно для куки
    cache: "no-store",
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
  await fetch(apiUrl("/auth/jwt/logout"), {
    method: "POST",
    credentials: "include",
  });
}

export async function getMe() {
  const res = await fetch(apiUrl("/auth/me"), { credentials: "include" });
  if (!res.ok) return null;
  return await res.json();
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

  const res = await fetch(apiUrl(`/products?${params}`), { credentials: "include" });
  ok(res);
  return await res.json();
}

export async function fetchProductsRaw(search = "", limit = 30, offset = 0, onlyWithoutImages = false) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  params.append("limit", limit);
  params.append("offset", offset);
  if (onlyWithoutImages) params.append("only_without_images", "true");

  const res = await fetch(apiUrl(`/products/raw?${params}`), { credentials: "include" });
  ok(res);
  return await res.json();
}

export async function fetchProductsCount() {
  const res = await fetch(apiUrl("/products/count"), { credentials: "include" });
  ok(res);
  return await res.json();
}

export async function fetchProductById(id) {
  const res = await fetch(apiUrl(`/api/product/${id}`), { credentials: "include" });
  ok(res);
  return await res.json();
}

export async function fetchPopularProducts(limit = 20) {
  const res = await fetch(apiUrl(`/popular-products?limit=${limit}`), { credentials: "include" });
  ok(res);
  return await res.json();
}

export async function incrementProductView(id) {
  await fetch(apiUrl(`/api/product/${id}/view`), {
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

  const res = await fetch(apiUrl(`/brands/filtered?${params}`), { credentials: "include" });
  if (!res.ok) return [];
  return await res.json();
}

export async function fetchFilteredGenders({ categoryKey, subcategoryKey, brand, size, search }) {
  const params = new URLSearchParams();
  if (categoryKey) params.append("category_key", categoryKey);
  if (subcategoryKey) params.append("subcategory_key", subcategoryKey);
  if (brand) params.append("brand", brand);
  if (size) params.append("size", size);
  if (search) params.append("search", search);

  const res = await fetch(apiUrl(`/genders/filtered?${params}`), { credentials: "include" });
  if (!res.ok) return [];
  return await res.json();
}

export async function fetchFilteredSizes({ categoryKey, subcategoryKey, brand, gender, search }) {
  const params = new URLSearchParams();
  if (categoryKey) params.append("category_key", categoryKey);
  if (subcategoryKey) params.append("subcategory_key", subcategoryKey);
  if (brand) params.append("brand", brand);
  if (gender) params.append("gender", gender);
  if (search) params.append("search", search);

  const res = await fetch(apiUrl(`/sizes/filtered?${params}`), { credentials: "include" });
  if (!res.ok) return [];
  return await res.json();
}

export async function fetchBrands() {
  const res = await fetch(apiUrl("/brands"), { credentials: "include" });
  if (!res.ok) return [];
  return await res.json();
}

export async function fetchCategories() {
  const res = await fetch(apiUrl("/categories"), { credentials: "include" });
  ok(res);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchPopularBrands(limit = 18) {
  const res = await fetch(apiUrl(`/brands/popular?limit=${limit}`), { credentials: "include" });
  ok(res);
  return await res.json(); // [{brand, count}]
}

// ========= ADMIN (superuser) =========
export async function uploadXlsx(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(apiUrl("/admin/upload_xlsx"), {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  ok(res);
  return await res.json();
}

export async function uploadProductImage(id, file, name = "") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name || "");

  const res = await fetch(apiUrl(`/admin/product/${id}/upload_image`), {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  ok(res);
  return await res.json();
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

  const res = await fetch(apiUrl(`/admin/product/${productId}/delete_image`), {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  ok(res);
  return await res.json();
}

export async function setProductImageUrl(id, imageUrl) {
  const res = await fetch(apiUrl(`/admin/product/${id}/set_image_url`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ image_url: imageUrl }),
  });
  ok(res);
  return await res.json();
}

export async function setProductReserved(id, reserved) {
  const res = await fetch(apiUrl(`/admin/product/${id}/set_reserved`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ reserved }),
  });
  ok(res);
  return await res.json();
}

export async function syncImagesForGroup(productId) {
  const res = await fetch(apiUrl(`/admin/product/${productId}/update_images_group`), {
    method: "POST",
    credentials: "include",
  });
  ok(res);
  return await res.json();
}

// ========= BANNERS =========
export async function fetchBanners() {
  const res = await fetch(apiUrl("/banners"), { credentials: "include" });
  ok(res);
  return await res.json();
}

export async function uploadBanner(imageFile, link = "", alt = "") {
  const formData = new FormData();
  formData.append("file", imageFile);
  formData.append("link", link);
  formData.append("alt", alt);

  const res = await fetch(apiUrl("/admin/banner/upload"), {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  ok(res);
  return await res.json();
}

export async function deleteBanner(bannerId) {
  const formData = new FormData();
  formData.append("banner_id", bannerId);

  const res = await fetch(apiUrl("/admin/banner/delete"), {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  ok(res);
  return await res.json();
}

// Если у тебя есть ручка обновления баннеров (в коде бэка её не видно):
export async function updateBanner(bannerId, fields) {
  const res = await fetch(apiUrl(`/admin/update_banner/${bannerId}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(fields),
  });
  ok(res);
  return await res.json();
}

// ========= (опционально, если такая ручка есть на бэке) =========
export async function fetchRandomProducts(limit = 20) {
  const res = await fetch(apiUrl(`/random-products?limit=${limit}`), { credentials: "include" });
  ok(res);
  return await res.json();
}
