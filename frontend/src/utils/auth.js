function emitAuthUpdated() {
  window.dispatchEvent(new Event("auth:updated"));
}

export function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

export async function ensureCsrf() {
  // Hits Django endpoint that sets csrftoken cookie
  await fetch("/api/auth/csrf/", {
    method: "GET",
    credentials: "include",
  });
}

/**
 * Returns the current logged-in user (session-based), or null if not logged in.
 * dj-rest-auth provides this at GET /api/auth/user/
 */
export async function fetchMe() {
  const res = await fetch("/api/auth/user/", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) return null;
  return res.json();
}

export async function login(email, password) {
  await ensureCsrf();
  const csrf = getCookie("csrftoken");

  const res = await fetch("/api/auth/login/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrf,
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      data?.non_field_errors?.[0] || data?.detail || "Login failed"
    );

  emitAuthUpdated();
  return data;
}

export async function signup({ username, email, password1, password2 }) {
  await ensureCsrf();
  const csrf = getCookie("csrftoken");

  const res = await fetch("/api/auth/registration/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrf,
    },
    body: JSON.stringify({ username, email, password1, password2 }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const firstFieldError =
      Object.values(data)?.flat()?.[0] || data?.detail || "Signup failed";
    throw new Error(firstFieldError);
  }

  emitAuthUpdated();
  return data;
}

export async function logout() {
  await ensureCsrf();
  const csrf = getCookie("csrftoken");

  const res = await fetch("/api/auth/logout/", {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRFToken": csrf },
  });

  if (!res.ok) throw new Error("Logout failed");

  emitAuthUpdated();
}


export async function syncCartItem(productId, qty) {
  const csrf = getCookie("csrftoken");

  await fetch("/api/cart-items/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrf,
    },
    body: JSON.stringify({
      product_id: productId,
      quantity: qty,
    }),
  });
}