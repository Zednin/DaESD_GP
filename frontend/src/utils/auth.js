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
  await fetch("/api/auth/csrf/", {
    method: "GET",
    credentials: "include",
  });
}

function getErrorMessage(data, fallback = "Something went wrong") {
  if (!data) return fallback;

  if (typeof data === "string") return data;

  if (data.detail) return data.detail;

  if (data.non_field_errors?.length) {
    return data.non_field_errors[0];
  }

  const firstValue = Object.values(data)[0];

  if (Array.isArray(firstValue) && firstValue.length > 0) {
    return firstValue[0];
  }

  if (typeof firstValue === "string") {
    return firstValue;
  }

  return fallback;
}

/**
 * Returns the current logged-in user, or null if not authenticated.
 */
export async function fetchMe() {
  const res = await fetch("/api/accounts/me/", {
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

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Login failed"));
  }

  emitAuthUpdated();
  return data;
}

export async function signupCustomer({
  username,
  email,
  password,
  first_name = "",
  last_name = "",
  organisation_type = "",
  organisation_name = "",
}) {
  await ensureCsrf();
  const csrf = getCookie("csrftoken");

  const payload = {
    username,
    email,
    password,
    first_name,
    last_name,
  };

  if (organisation_type) {
    payload.organisation_type = organisation_type;
  }

  if (organisation_name) {
    payload.organisation_name = organisation_name;
  }

  const res = await fetch("/api/auth/register/customer/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrf,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Customer signup failed"));
  }

  return data;
}

export async function signupProducer({
  username,
  email,
  password,
  first_name = "",
  last_name = "",
  company_name,
  company_number,
  company_description = "",
  lead_time_hours = 48,
}) {
  await ensureCsrf();
  const csrf = getCookie("csrftoken");

  const res = await fetch("/api/auth/register/producer/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrf,
    },
    body: JSON.stringify({
      username,
      email,
      password,
      first_name,
      last_name,
      company_name,
      company_number,
      company_description,
      lead_time_hours,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Producer signup failed"));
  }

  return data;
}

export async function logout() {
  await ensureCsrf();
  const csrf = getCookie("csrftoken");

  const res = await fetch("/api/auth/logout/", {
    method: "POST",
    credentials: "include",
    headers: {
      "X-CSRFToken": csrf,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Logout failed"));
  }

  emitAuthUpdated();
}

export async function syncCartItem(productId, qty) {
  await ensureCsrf();
  const csrf = getCookie("csrftoken");

  const res = await fetch("/api/cart-items/", {
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

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(getErrorMessage(data, "Failed to sync cart item"));
  }
}