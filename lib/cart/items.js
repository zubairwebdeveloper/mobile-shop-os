import { variantPrice } from "@/services/catalog";

export function cartKey(productId, colorName, ram, storage) {
  return `${productId}:${colorName}:${ram ?? 0}:${storage ?? 0}`;
}

// Product + selected variant -> plain serialisable cart line.
export function buildCartItem(product, selection = {}, qty = 1) {
  const colorIndex = selection.colorIndex ?? 0;
  const color = product.colors[colorIndex] ?? product.colors[0];
  const ram = selection.ram ?? product.ramOptions[0]?.value ?? null;
  const storage = selection.storage ?? product.storageOptions[0]?.value ?? null;
  const unitPrice = variantPrice(product, ram, storage);

  return {
    key: cartKey(product.id, color.name, ram, storage),
    productId: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    shape: product.shape,
    colorName: color.name,
    colorHex: color.hex,
    ram,
    storage,
    unitPrice,
    qty,
    maxStock: product.stock,
  };
}
