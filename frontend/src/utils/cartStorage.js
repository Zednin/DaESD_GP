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

function mapServerCartToUiItems(serverCart) {
  // server item fields: { id, product_id, name, unit, quantity, price_snapshot }
  return (serverCart.items || []).map((it) => ({
    cartItemId: it.id,                // needed for update/delete
    productId: it.product_id,
    name: it.name,
    unit: it.unit,
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
  if (!isAuthed()) {
    // guest (local)
    const items = readCart();
    const existing = items.find((i) => i.productId === product.id);

    const next = existing
      ? items.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + qty } : i
        )
      : [
          ...items,
          { productId: product.id, name: product.name, unit: product.unit, price: Number(product.price), qty },
        ];

    writeCart(next);
    return next;
  }

  // signed in (server)
  console.log("[cart] addServerItem ->", { productId: product.id, qty });
  await addServerItem(product.id, qty);

  console.log("[cart] refreshCartFromServer");
  return refreshCartFromServer();
}

export async function updateCartQty(productId, qty) {
  const nextQty = Math.max(1, Number(qty || 1));

  if (!isAuthed()) {
    const items = readCart();
    const next = items.map((i) =>
      i.productId === productId ? { ...i, qty: nextQty } : i
    );
    writeCart(next);
    return next;
  }

  // signed in: update by cartItemId (found in cached items)
  const items = readCart();
  const target = items.find((i) => i.productId === productId);
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