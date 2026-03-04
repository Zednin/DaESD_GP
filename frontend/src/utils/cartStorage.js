const CART_KEY = "brfn_cart_v1";
import { syncCartItem } from "./auth";

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
  // notify other components (Cart page / Navbar)
  window.dispatchEvent(new Event("cart:updated"));
}

export function getCartSubtotal(items) {
  return items.reduce((sum, i) => sum + Number(i.price) * i.qty, 0);
}

export function getCartCount(items) {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

export function addToCart(product, qty) {
  const items = readCart();
  const existing = items.find((i) => i.productId === product.id);

  const next = existing
    ? items.map((i) =>
        i.productId === product.id ? { ...i, qty: i.qty + qty } : i
      )
    : [
        ...items,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          price: Number(product.price),
          qty,
        },
      ];

  writeCart(next);

  //  SYNC TO BACKEND
  syncCartItem(product.id, qty);

  return next;
}


export function updateCartQty(productId, qty) {
  const items = readCart();
  const nextQty = Math.max(1, Number(qty || 1));
  const next = items.map((i) =>
    i.productId === productId ? { ...i, qty: nextQty } : i
  );
  writeCart(next);
  return next;
}

export function removeFromCart(productId) {
  const items = readCart();
  const next = items.filter((i) => i.productId !== productId);
  writeCart(next);
  return next;
}

export function clearCart() {
  writeCart([]);
}

