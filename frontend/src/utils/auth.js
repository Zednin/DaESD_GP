import apiClient from "./apiClient";

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
  await apiClient.get("/auth/csrf/");
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

function normaliseAxiosError(error, fallback) {
  const data = error?.response?.data;
  return new Error(getErrorMessage(data, fallback));
}

/**
 * Returns the current logged-in user, or null if not authenticated.
 */
export async function fetchMe() {
  try {
    const { data } = await apiClient.get("/accounts/me/");
    return data;
  } catch (error) {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      return null;
    }
    return null;
  }
}

export async function login(email, password) {
  try {
    await ensureCsrf();

    const { data } = await apiClient.post("/auth/login/", {
      email,
      password,
    });

    emitAuthUpdated();
    return data;
  } catch (error) {
    throw normaliseAxiosError(error, "Login failed");
  }
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
  try {
    await ensureCsrf();

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

    const { data } = await apiClient.post("/auth/register/customer/", payload);
    return data;
  } catch (error) {
    throw normaliseAxiosError(error, "Customer signup failed");
  }
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
  try {
    await ensureCsrf();

    const { data } = await apiClient.post("/auth/register/producer/", {
      username,
      email,
      password,
      first_name,
      last_name,
      company_name,
      company_number,
      company_description,
      lead_time_hours,
    });

    return data;
  } catch (error) {
    throw normaliseAxiosError(error, "Producer signup failed");
  }
}

export async function logout() {
  try {
    await ensureCsrf();
    await apiClient.post("/auth/logout/");

    emitAuthUpdated();
  } catch (error) {
    throw normaliseAxiosError(error, "Logout failed");
  }
}

export async function syncCartItem(productId, qty) {
  try {
    await ensureCsrf();

    await apiClient.post("/cart-items/", {
      product_id: productId,
      quantity: qty,
    });
  } catch (error) {
    throw normaliseAxiosError(error, "Failed to sync cart item");
  }
}