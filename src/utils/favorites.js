export function favoriteToProductCard(favorite) {
  if (!favorite) return null;
  const snapshot = favorite.product || {};

  let sizes = [];
  if (Array.isArray(snapshot.sizes)) {
    sizes = snapshot.sizes;
  } else if (typeof snapshot.sizes === "string") {
    sizes = snapshot.sizes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return {
    ...snapshot,
    id: snapshot.id,
    name: snapshot.name || favorite.product_name,
    sitename: snapshot.sitename || snapshot.name || favorite.product_name,
    color: snapshot.color || favorite.product_color,
    image_url: snapshot.image_url || "",
    sizes,
  };
}
