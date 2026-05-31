import axios from "axios";
import { getStoreConfig, getStoreDomain, getStoreHeaders, getUrl } from "./client";

const getAuthConfig = () => ({
  headers: {
    ...getStoreHeaders(),
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  },
});

export const getProducts = async (currentPage) => {
  try {
    return await axios.get(
      `${getUrl()}/api/v1/products?page=${currentPage}&size=${8}`,
      getStoreConfig(),
    );
  } catch (e) {
    throw e;
  }
};

export const getSales = async () => {
  try {
    return await axios.get(`${getUrl()}/api/v1/products/sales`, getStoreConfig());
  } catch (e) {
    throw e;
  }
};

export const updateSale = async (details) => {
  try {
    return await axios.post(`${getUrl()}/api/v1/products/sales`, details, {
      ...getAuthConfig(),
    });
  } catch (e) {
    throw e;
  }
};

export const getProductsByCategory = async (category, currentPage) => {
  try {
    return await axios.get(
      `${getUrl()}/api/v1/products/by-category?category=${category}&page=${currentPage}&size=${8}`,
      getStoreConfig(),
    );
  } catch (e) {
    throw e;
  }
};

export const getProductsByName = async (query, currentPage) => {
  try {
    return await axios.get(`${getUrl()}/api/v1/products/by-name`, {
      headers: getStoreConfig().headers,
      params: {
        query,
        page: currentPage,
        size: 8,
      },
    });
  } catch (e) {
    throw e;
  }
};

export const fetchCustomerByCPF = async (cpf) => {
  try {
    return await axios.get(
      `${getUrl()}/api/v1/customers/cpf/${cpf}`,
      getStoreConfig(),
    );
  } catch (e) {
    throw e;
  }
};

export const sell = async (details) => {
  try {
    return await axios.post(`${getUrl()}/api/v1/products/sell`, details, {
      ...getAuthConfig(),
    });
  } catch (e) {
    throw e;
  }
};

export const saveProduct = async (product, image) => {
  try {
    let productId = await axios.post(`${getUrl()}/api/v1/products`, product, {
      ...getAuthConfig(),
    });
    if (image) {
      const formData = new FormData();
      formData.append("file", image);
      await axios.post(
        `${getUrl()}/api/v1/products/${productId.data}/profile-image`,
        formData,
        {
          ...getAuthConfig(),
          "Content-Type": "multipart/form-data",
        },
      );
    }
  } catch (e) {
    throw e;
  }
};

export const saveProductMultiImage = async (formData) => {
  try {
    const response = await axios.post(
      `${getUrl()}/api/v1/products/with-images`,
      formData,
      {
        ...getAuthConfig(),
        headers: {
          ...getAuthConfig().headers,
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data; // Pode ser o productId ou os dados do produto criado
  } catch (e) {
    throw e;
  }
};

export const updateProduct = async (id, update) => {
  try {
    return await axios.put(`${getUrl()}/api/v1/products/${id}`, update, {
      ...getAuthConfig(),
      "Content-Type": "multipart/form-data",
    });
  } catch (e) {
    throw e;
  }
};

export const deleteProduct = async (id) => {
  try {
    return await axios.delete(`${getUrl()}/api/v1/products/${id}`, {
      ...getAuthConfig(),
    });
  } catch (e) {
    throw e;
  }
};
export const uploadProductPicture = async (id, formData) => {
  try {
    return axios.post(
      `${getUrl()}/api/v1/products/${id}/profile-image`,
      formData,
      {
        ...getAuthConfig(),
        "Content-Type": "multipart/form-data",
      },
    );
  } catch (e) {
    throw e;
  }
};

export const getProductImagesById = async (id) => {
  try {
    const response = await axios.get(
      `${getUrl()}/api/v1/products/${id}/images`,
      getStoreConfig(),
    );
    return {
      ...response,
      data: response.data.map((image) => ({
        ...image,
        url: productsPictureUrl(id, image.id),
      })),
    };
  } catch (e) {
    throw e;
  }
};

export const productsPictureUrl = (id, imageId) => {
  const params = new URLSearchParams();
  const storeDomain = getStoreDomain();
  if (imageId) {
    params.set("imageId", imageId);
  }
  if (storeDomain) {
    params.set("storeDomain", storeDomain);
  }

  const query = params.toString();
  return `${getUrl()}/api/v1/products/${id}/profile-image${query ? `?${query}` : ""}`;
};
