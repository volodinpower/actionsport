// src/api.js

function getAdminToken() {
  return localStorage.getItem("admin_token");
}

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

// --- ГЛАВНАЯ функция получения товаров с фильтрами ---
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

  const res = await fetch(apiUrl(`/products?${params}`));
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function fetchRandomProducts(limit = 20) {
  const res = await fetch(apiUrl(`/random-products?limit=${limit}`));
  if (!res.ok) throw new Error("Failed to fetch random products");
  return await res.json();
}

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

export async function fetchProductById(id) {
  const res = await fetch(apiUrl(`/api/product/${id}`));
  if (!res.ok) throw new Error("Failed to fetch product");
  return await res.json();
}

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

export async function deleteProductImage(productId, imageUrl) {
  let relativeUrl = imageUrl;
  if (relativeUrl.startsWith("http")) {
    const idx = relativeUrl.indexOf("/static/");
    if (idx > -1) relativeUrl = relativeUrl.slice(idx);
  }
  const formData = new FormData();
  formData.append("url", relativeUrl);
  const token = localStorage.getItem("admin_token");
  const res = await fetch(apiUrl(`/admin/product/${productId}/delete_image`), {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: "Bearer " + token } : {},
  });
  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.href = "/admin";
    throw new Error("Авторизация истекла, войдите заново");
  }
  if (!res.ok) throw new Error("Ошибка удаления");
  return await res.json();
}

export async function getXlsxImportReport(file) {
  return await uploadXlsx(file);
}

export async function fetchProductDetails(id) {
  return await fetchProductById(id);
}

export async function fetchProductsWithoutImages(limit = 30, offset = 0) {
  return await fetchProducts("", limit, offset, true);
}

export async function fetchProductsCount() {
  const res = await fetch(apiUrl("/products/count"));
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

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

// --- Новый: Фильтр брендов по всем активным фильтрам ---
export async function fetchFilteredBrands({ categoryKey, subcategoryKey, gender, size, search }) {
  const params = new URLSearchParams();
  if (categoryKey) params.append("category_key", categoryKey);
  if (subcategoryKey) params.append("subcategory_key", subcategoryKey);
  if (gender) params.append("gender", gender);
  if (size) params.append("size", size);
  if (search) params.append("search", search);
  const url = `/brands/filtered?${params.toString()}`;
  const res = await fetch(import.meta.env.VITE_API_URL + url);
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
  const url = `/genders/filtered?${params.toString()}`;
  const res = await fetch(import.meta.env.VITE_API_URL + url);
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
  const url = `/sizes/filtered?${params.toString()}`;
  const res = await fetch(import.meta.env.VITE_API_URL + url);
  if (!res.ok) return [];
  return await res.json();
}

// --- Старый (все бренды без фильтра, можешь не использовать) ---
export async function fetchBrands() {
  const res = await fetch(apiUrl("/brands"));
  if (!res.ok) return [];
  return await res.json();
}

export async function fetchBanners() {
  const res = await fetch(apiUrl("/banners"));
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

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

export async function fetchCategories() {
  const res = await fetch(apiUrl("/categories"));
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
