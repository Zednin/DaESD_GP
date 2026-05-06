const CART_KEY = "brfn_cart_v1";
export const MIN_CHECKOUT_AMOUNT = 0.3;
export const MIN_CHECKOUT_MESSAGE =
  "Card payments must be at least £0.30. Add another item to continue.";

import {
  fetchServerCart,
  mergeServerCart,
  addServerItem,
  updateServerItem,
  removeServerItem,
  clearServerCart,
} from "./cartApi";

import {
  defaultBulkDiscountPercent,
  getCartLinePricing,
  getQuantityLimit,
  getStockLimit,
  individualQuantityLimit,
} from "./bulkPricing";

export {
  defaultBulkDiscountPercent,
  getAvailableQuantity,
  getBulkDiscountedUnitPrice,
  getBulkDiscountPercent,
  getBulkThreshold,
  getCartLinePricing,
  getIndividualQuantityLimit,
  getPreBulkUnitPrice,
  getQuantity,
  getQuantityLimit,
  getStockLimit,
  individualQuantityLimit,
  isBulkQuantity,
} from "./bulkPricing";

// --------------------
// Local helpers (guest + cache)
// --------------------
export function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart:updated"));
}

export function clearCartLocal() {
  writeCart([]);
}

// --------------------
// shared pricing helpers keep cart totals aligned with checkout.
// --------------------
export function getCartSubtotal(items, options = {}) {
  return items.reduce((sum, item) => sum + getCartLinePricing(item, options).lineTotal, 0);
}

export function getCartOriginalSubtotal(items, options = {}) {
  return items.reduce((sum, item) => sum + getCartLinePricing(item, options).originalLineTotal, 0);
}

export function getCartDiscountTotal(items, options = {}) {
  return items.reduce((sum, item) => sum + getCartLinePricing(item, options).discountAmount, 0);
}

export function getCartCount(items) {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

export function getCartQtyForProduct(productId, items = readCart()) {
  const target = items.find((i) => i.productId === productId);
  return Number(target?.qty || 0);
}

// --------------------
// Auth detection (adapt if you store auth differently)
// --------------------
let CART_AUTHED = false;

export function setCartAuthed(isAuthed) {
  CART_AUTHED = Boolean(isAuthed);
}

function isAuthed() {
  return CART_AUTHED;
}

function getQuantityLimitMessage(product, remainingQty, stockLimit, quantityLimit) {
  if (quantityLimit < stockLimit) {
    return remainingQty > 0
      ? `${remainingQty} more ${product?.name || "item"} available for individual customers.`
      : `Individual customers can add up to ${quantityLimit} of each item.`;
  }

  return remainingQty > 0
    ? `${remainingQty} more ${product?.name || "item"} available.`
    : `${product?.name || "This product"} is already at the available stock limit in your basket.`;
}

function mapServerCartToUiItems(serverCart) {
  return (serverCart.items || []).map((it) => ({
    cartItemId: it.id,
    productId: it.product_id,
    name: it.name,
    unit: it.unit,
    stock: it.stock,
    status: it.status,
    qty: it.quantity,
    price: Number(it.price_snapshot),
    pre_bulk_price: Number(it.pre_bulk_price ?? it.price_snapshot),
    // producer metadata and bulk settings keep cached carts current.
    producer_id: it.producer_id,
    producer_name: it.producer_name,
    leadTimeHours: it.lead_time_hours,
    bulk_stock_threshold: Number(it.bulk_stock_threshold ?? individualQuantityLimit),
    bulk_stock_discount: Number(it.bulk_stock_discount ?? defaultBulkDiscountPercent),
  }));
}

function getProductCartFields(product) {
  // normalize product fields before writing them into local cart state.
  return {
    stock: product.stock,
    status: product.status,
    price: Number(product.price),
    pre_bulk_price: Number(product.pre_bulk_price ?? product.price),
    producer_id: product.producer_id || product.producer_profile_id || product.producer,
    producer_name: product.producer_name,
    leadTimeHours: product.lead_time_hours,
    bulk_stock_threshold: Number(product.bulk_stock_threshold ?? individualQuantityLimit),
    bulk_stock_discount: Number(product.bulk_stock_discount ?? defaultBulkDiscountPercent),
  };
}

// Pull server cart into local cache + notify UI
export async function refreshCartFromServer() {
  console.log("[cart] fetchServerCart...");
  const serverCart = await fetchServerCart();
  console.log("[cart] fetchServerCart result:", serverCart);

  const uiItems = mapServerCartToUiItems(serverCart);
  console.log("[cart] mapped uiItems:", uiItems);

  writeCart(uiItems); // cache for UI
  return uiItems;
}

// --------------------
// Public API used by UI
// --------------------
export async function addToCart(product, qty, options = {}) {
  console.log("[cart] addToCart", { authed: isAuthed(), productId: product?.id, qty });
  const stockLimit = getStockLimit(product);
  const quantityLimit = getQuantityLimit(product, options);
  const requestedQty = Math.max(1, Number(qty || 1));

  if (stockLimit <= 0 || product?.status === "unavailable") {
    throw new Error(`${product?.name || "This product"} is currently unavailable.`);
  }

  if (!isAuthed()) {
    // guest (local)
    const items = readCart();
    const existing = items.find((i) => i.productId === product.id);
    const existingQty = Number(existing?.qty || 0);
    const remainingQty = quantityLimit - existingQty;

    if (requestedQty > remainingQty) {
      throw new Error(getQuantityLimitMessage(product, remainingQty, stockLimit, quantityLimit));
    }

    const nextQty = existingQty + requestedQty;

    const next = existing
      ? items.map((i) =>
          i.productId === product.id
            ? { ...i, ...getProductCartFields(product), qty: nextQty }
            : i
        )
      : [
          ...items,
          {
            productId: product.id,
            name: product.name,
            unit: product.unit,
            qty: requestedQty,
            ...getProductCartFields(product),
          },
        ];

    writeCart(next);
    return next;
  }

  // signed in (server)
  const cachedItems = readCart();
  const cachedQty = getCartQtyForProduct(product.id, cachedItems);
  const remainingQty = quantityLimit - cachedQty;

  if (requestedQty > remainingQty) {
    throw new Error(getQuantityLimitMessage(product, remainingQty, stockLimit, quantityLimit));
  }

  console.log("[cart] addServerItem ->", { productId: product.id, qty: requestedQty });
  await addServerItem(product.id, requestedQty);

  console.log("[cart] refreshCartFromServer");
  return refreshCartFromServer();
}

export async function updateCartQty(productId, qty, options = {}) {
  const items = readCart();
  const target = items.find((i) => i.productId === productId);
  const stockLimit = getStockLimit(target);
  const quantityLimit = getQuantityLimit(target, options);

  if (stockLimit <= 0 || target?.status === "unavailable") {
    throw new Error(`${target?.name || "This product"} is currently unavailable.`);
  }

  const nextQty = Math.min(Math.max(1, Number(qty || 1)), quantityLimit);

  if (!isAuthed()) {
    const next = items.map((i) =>
      i.productId === productId ? { ...i, qty: nextQty } : i
    );
    writeCart(next);
    return next;
  }

  // signed in: update by cartItemId (found in cached items)
  if (!target?.cartItemId) return refreshCartFromServer();

  await updateServerItem(target.cartItemId, nextQty);
  return refreshCartFromServer();
}

export async function removeFromCart(productId) {
  if (!isAuthed()) {
    const items = readCart();
    const next = items.filter((i) => i.productId !== productId);
    writeCart(next);
    return next;
  }

  const items = readCart();
  const target = items.find((i) => i.productId === productId);
  if (!target?.cartItemId) return refreshCartFromServer();

  await removeServerItem(target.cartItemId);
  return refreshCartFromServer();
}

export async function clearCart() {
  if (!isAuthed()) {
    clearCartLocal();
    return [];
  }
  await clearServerCart();
  return refreshCartFromServer();
}

// --------------------
// Merge local -> server on sign-in
// --------------------
export async function migrateLocalCartToServerIfNeeded(forceAuthed = false) {
  if (!forceAuthed && !isAuthed()) return;

  const localItems = readCart();

  // If cache already contains cartItemId, it’s likely already server cache – don’t “merge” that.
  const looksLikeServerCache = localItems.some((i) => i.cartItemId);
  if (looksLikeServerCache) return;

  if (localItems.length > 0) {
    await mergeServerCart(localItems.map((i) => ({ product_id: i.productId, qty: i.qty })));
    clearCartLocal(); // clear guest cart after merge
  }

  await refreshCartFromServer(); // cache server cart for UI
}
