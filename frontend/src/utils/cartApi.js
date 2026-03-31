import apiClient from "./apiClient";

async function ensureCsrf() {
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

export async function fetchServerCart() {
  try {
    console.log("[cartApi] GET /carts/");
    const { data } = await apiClient.get("/carts/");
    return data;
  } catch (error) {
    console.error("[cartApi] fetchServerCart failed:", error);
    throw normaliseAxiosError(error, "Failed to fetch cart");
  }
}

export async function mergeServerCart(items) {
  try {
    console.log("[cartApi] POST /carts/merge/", items);
    await ensureCsrf();

    const { data } = await apiClient.post("/carts/merge/", { items });
    return data;
  } catch (error) {
    console.error("[cartApi] mergeServerCart failed:", error);
    throw normaliseAxiosError(error, "Failed to merge cart");
  }
}

export async function addServerItem(productId, quantity) {
  try {
    console.log("[cartApi] POST /cart-items/", { productId, quantity });
    await ensureCsrf();

    await apiClient.post("/cart-items/", {
      product_id: productId,
      quantity,
    });
  } catch (error) {
    console.error("[cartApi] addServerItem failed:", error);
    throw normaliseAxiosError(error, "Failed to add item");
  }
}

export async function updateServerItem(cartItemId, quantity) {
  try {
    console.log("[cartApi] PATCH /cart-items/", { cartItemId, quantity });
    await ensureCsrf();

    await apiClient.patch(`/cart-items/${cartItemId}/`, {
      quantity,
    });
  } catch (error) {
    console.error("[cartApi] updateServerItem failed:", error);
    throw normaliseAxiosError(error, "Failed to update item");
  }
}

export async function removeServerItem(cartItemId) {
  try {
    console.log("[cartApi] DELETE /cart-items/", cartItemId);
    await ensureCsrf();

    await apiClient.delete(`/cart-items/${cartItemId}/`);
  } catch (error) {
    console.error("[cartApi] removeServerItem failed:", error);
    throw normaliseAxiosError(error, "Failed to remove item");
  }
}

export async function clearServerCart() {
  try {
    console.log("[cartApi] POST /cart-items/clear/");
    await ensureCsrf();

    await apiClient.post("/cart-items/clear/");
  } catch (error) {
    console.error("[cartApi] clearServerCart failed:", error);
    throw normaliseAxiosError(error, "Failed to clear cart");
  }
}