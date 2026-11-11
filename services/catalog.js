// Catalog service (mock). Same function signatures will be backed by Firestore in Phase 04,
// so pages and components never import mock data directly.
import { MOCK_PRODUCTS } from "@/data/mock/products";
import { MOCK_BRANDS, MOCK_CATEGORIES } from "@/data/mock/taxonomy";
import { MOCK_POSTS, MOCK_REVIEWS, MOCK_FAQS } from "@/data/mock/content";

function enrich(p) {
  const rams = p.ramOptions.map((o) => o.value);
  const storages = p.storageOptions.map((o) => o.value);
  const ramDelta = p.ramOptions[0]?.delta ?? 0;
  const storageDelta = p.storageOptions[0]?.delta ?? 0;
  return {
    ...p,
    rams,
    storages,
    price: p.basePrice + ramDelta + storageDelta,
    inStock: p.stock > 0,
  };
}

const PRODUCTS = MOCK_PRODUCTS.map(enrich);

export const getAllProducts = () => PRODUCTS;
export const getProductBySlug = (slug) => PRODUCTS.find((p) => p.slug === slug) ?? null;
export const getFeatured = () => PRODUCTS.filter((p) => p.featured);
export const getBestSellers = () => PRODUCTS.filter((p) => p.bestseller);
export const getLatest = () =>
  [...PRODUCTS].sort((a, b) => b.releasedAt.localeCompare(a.releasedAt)).slice(0, 8);
export const getDeals = () =>
  PRODUCTS.filter((p) => p.compareAtPrice && p.compareAtPrice > p.price).sort(
    (a, b) => b.compareAtPrice / b.price - a.compareAtPrice / a.price,
  );
export const getByBrand = (slug) => PRODUCTS.filter((p) => p.brand === slug);
export const getByCategory = (slug) => PRODUCTS.filter((p) => p.category === slug);
export const getRelated = (product, limit = 4) =>
  PRODUCTS.filter(
    (p) => p.id !== product.id && (p.category === product.category || p.brand === product.brand),
  )
    .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category))
    .slice(0, limit);

export const getBrands = () => MOCK_BRANDS;
export const getBrand = (slug) => MOCK_BRANDS.find((b) => b.slug === slug) ?? null;
export const getBrandName = (slug) => getBrand(slug)?.name ?? slug;
export const getCategories = () => MOCK_CATEGORIES;
export const getCategory = (slug) => MOCK_CATEGORIES.find((c) => c.slug === slug) ?? null;

export const getPosts = () => MOCK_POSTS;
export const getPost = (slug) => MOCK_POSTS.find((p) => p.slug === slug) ?? null;
export const getReviews = () => MOCK_REVIEWS;
export const getFaqs = () => MOCK_FAQS;

export function variantPrice(product, ramValue, storageValue) {
  const ram = product.ramOptions.find((o) => o.value === ramValue)?.delta ?? 0;
  const storage = product.storageOptions.find((o) => o.value === storageValue)?.delta ?? 0;
  return product.basePrice + ram + storage;
}

export function filterProducts(products, f) {
  const q = f.search.trim().toLowerCase();
  let list = products.filter((p) => {
    if (q && !`${p.name} ${getBrandName(p.brand)} ${p.category}`.toLowerCase().includes(q)) return false;
    if (f.brands.length && !f.brands.includes(p.brand)) return false;
    if (f.categories.length && !f.categories.includes(p.category)) return false;
    if (p.price < f.price[0] || p.price > f.price[1]) return false;
    if (f.rams.length && !p.rams.some((r) => f.rams.includes(r))) return false;
    if (f.storages.length && !p.storages.some((s) => f.storages.includes(s))) return false;
    if (f.conditions.length && !f.conditions.includes(p.condition)) return false;
    if (f.inStockOnly && !p.inStock) return false;
    return true;
  });

  const sorters = {
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
    newest: (a, b) => b.releasedAt.localeCompare(a.releasedAt),
    featured: (a, b) => Number(!!b.featured) - Number(!!a.featured) || b.reviewCount - a.reviewCount,
  };
  list = [...list].sort(sorters[f.sort] ?? sorters.featured);
  return list;
}
