const CART_KEY = "brfn_cart_v1";

import {
  fetchServerCart,
  mergeServerCart,
  addServerItem,
  updateServerItem,
  removeServerItem,
  clearServerCart,
} from "./cartApi";

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
// Shared helpers
// --------------------
export function getCartSubtotal(items) {
  return items.reduce((sum, i) => sum + Number(i.price) * i.qty, 0);
}

export function getCartCount(items) {
  return items.reduce((sum, i) => sum + i.qty, 0);
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

function getStockLimit(itemOrProduct) {
  const stock = Number(itemOrProduct?.stock);
  return Number.isFinite(stock) ? Math.max(0, stock) : Infinity;
}

function mapServerCartToUiItems(serverCart) {
  // server item fields: { id, product_id, name, unit, quantity, price_snapshot }
  return (serverCart.items || []).map((it) => ({
    cartItemId: it.id,                // needed for update/delete
    productId: it.product_id,
    name: it.name,
    unit: it.unit,
    stock: it.stock,
    status: it.status,
    qty: it.quantity,
    price: Number(it.price_snapshot),
  }));
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
export async function addToCart(product, qty) {
  console.log("[cart] addToCart", { authed: isAuthed(), productId: product?.id, qty });
  const stockLimit = getStockLimit(product);
  const requestedQty = Math.max(1, Number(qty || 1));

  if (stockLimit <= 0 || product?.status === "unavailable") {
    throw new Error(`${product?.name || "This product"} is currently unavailable.`);
  }

  if (!isAuthed()) {
    // guest (local)
    const items = readCart();
    const existing = items.find((i) => i.productId === product.id);
    const existingQty = Number(existing?.qty || 0);
    const nextQty = Math.min(existingQty + requestedQty, stockLimit);

    const next = existing
      ? items.map((i) =>
          i.productId === product.id ? { ...i, qty: nextQty } : i
        )
      : [
          ...items,
          {
            productId: product.id,
            name: product.name,
            unit: product.unit,
            stock: product.stock,
            status: product.status,
            price: Number(product.price),
            qty: Math.min(requestedQty, stockLimit),
          },
        ];

    writeCart(next);
    return next;
  }

  // signed in (server)
  console.log("[cart] addServerItem ->", { productId: product.id, qty: requestedQty });
  await addServerItem(product.id, requestedQty);

  console.log("[cart] refreshCartFromServer");
  return refreshCartFromServer();
}

export async function updateCartQty(productId, qty) {
  const items = readCart();
  const target = items.find((i) => i.productId === productId);
  const stockLimit = getStockLimit(target);

  if (stockLimit <= 0 || target?.status === "unavailable") {
    throw new Error(`${target?.name || "This product"} is currently unavailable.`);
  }

  const nextQty = Math.min(Math.max(1, Number(qty || 1)), stockLimit);

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
