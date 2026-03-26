import apiClient from "./apiClient";

export async function uploadProductImage(productId, file) {
  const formData = new FormData();
  formData.append("image", file);

  const res = await apiClient.post(
    `/products/${productId}/upload-image/`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return res.data;
}