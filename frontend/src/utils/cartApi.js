const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

async function ensureCsrf() {
  await fetch(`${API_BASE}/api/auth/csrf/`, {
    method: "GET",
    credentials: "include",
  });
}

function csrfHeaders() {
  const csrf = getCookie("csrftoken");
  return csrf ? { "X-CSRFToken": csrf } : {};
}

export async function fetchServerCart() {
  console.log("[cartApi] GET /api/carts/");
  const res = await fetch(`${API_BASE}/api/carts/`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  console.log("[cartApi] fetchServerCart status:", res.status);
  if (!res.ok) throw new Error("Failed to fetch cart");
  return res.json();
}

export async function mergeServerCart(items) {
  console.log("[cartApi] POST /api/carts/merge/", items);
  await ensureCsrf();

  const res = await fetch(`${API_BASE}/api/carts/merge/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    body: JSON.stringify({ items }),
  });

  console.log("[cartApi] mergeServerCart status:", res.status);
  if (!res.ok) throw new Error("Failed to merge cart");
  return res.json();
}

export async function addServerItem(productId, quantity) {
  console.log("[cartApi] POST /api/cart-items/", { productId, quantity });
  await ensureCsrf();

  const res = await fetch(`${API_BASE}/api/cart-items/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    body: JSON.stringify({ product_id: productId, quantity }),
  });

  console.log("[cartApi] addServerItem status:", res.status);
  if (!res.ok) throw new Error("Failed to add item");
}

export async function updateServerItem(cartItemId, quantity) {
  console.log("[cartApi] PATCH /api/cart-items/", { cartItemId, quantity });
  await ensureCsrf();

  const res = await fetch(`${API_BASE}/api/cart-items/${cartItemId}/`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    body: JSON.stringify({ quantity }),
  });

  console.log("[cartApi] updateServerItem status:", res.status);
  if (!res.ok) throw new Error("Failed to update item");
}

export async function removeServerItem(cartItemId) {
  console.log("[cartApi] DELETE /api/cart-items/", cartItemId);
  await ensureCsrf();

  const res = await fetch(`${API_BASE}/api/cart-items/${cartItemId}/`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      ...csrfHeaders(),
    },
  });

  console.log("[cartApi] removeServerItem status:", res.status);
  if (!res.ok) throw new Error("Failed to remove item");
}

export async function clearServerCart() {
  console.log("[cartApi] POST /api/cart-items/clear/");
  await ensureCsrf();

  const res = await fetch(`${API_BASE}/api/cart-items/clear/`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...csrfHeaders(),
    },
  });

  console.log("[cartApi] clearServerCart status:", res.status);
  if (!res.ok) throw new Error("Failed to clear cart");
}