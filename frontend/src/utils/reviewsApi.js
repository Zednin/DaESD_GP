import apiClient from "./apiClient";
import { ensureCsrf } from "./auth";

export async function getProductReviewSummary(productId) {
  const { data } = await apiClient.get(`/reviews/product/${productId}/summary/`);
  return data;
}

export async function getProductReviews(productId, params = {}) {
  const { data } = await apiClient.get(`/reviews/product/${productId}/`, {
    params,
  });
  return Array.isArray(data) ? data : data.results || [];
}

export async function getMyReviews() {
  const { data } = await apiClient.get("/reviews/mine/");
  return Array.isArray(data) ? data : data.results || [];
}

export async function createReview(payload) {
  await ensureCsrf();
  const { data } = await apiClient.post("/reviews/", payload);
  return data;
}

export async function updateReview(reviewId, payload) {
  await ensureCsrf();
  const { data } = await apiClient.patch(`/reviews/${reviewId}/`, payload);
  return data;
}

export async function deleteReview(reviewId) {
  await ensureCsrf();
  await apiClient.delete(`/reviews/${reviewId}/`);
}

export async function getReview(reviewId) {
  const { data } = await apiClient.get(`/reviews/${reviewId}/`);
  return data;
}