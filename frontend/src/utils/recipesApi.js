import apiClient from "./apiClient";

export async function getRecipesForProduct(productId) {
  const { data } = await apiClient.get("/recipes/", {
    params: { products: productId, is_published: true },
  });
  return Array.isArray(data) ? data : data?.results || [];
}
