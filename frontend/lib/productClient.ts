import { ProductsResponse } from "@/types/ProductTypes";
import axios from "axios";

const PAGE_SIZE = 8;
const PROMO_PAGE_SIZE = 500;
const DEFAULT_API_BASE_URL = "http://localhost:8080/api/v1";
const DEFAULT_API_BUILD_URL = DEFAULT_API_BASE_URL;

const getBuildApiBaseUrl = () => {
  return (
    process.env.NEXT_PUBLIC_API_BUILD_URL || DEFAULT_API_BUILD_URL
  ).replace(/\/+$/, "");
};

const getRuntimeApiBaseUrl = () => {
  return (
    process.env.NEXT_PUBLIC_API_RUNTIME_URL ||
    process.env.NEXT_PUBLIC_API_BUILD_URL ||
    DEFAULT_API_BASE_URL
  ).replace(/\/+$/, "");
};

export const getCurrentStoreDomain = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return normalizeStoreDomain(window.location.hostname);
};

export const normalizeStoreDomain = (domain: string) => {
  const normalized = (domain || "").trim().toLowerCase();
  return normalized.startsWith("www.") ? normalized.substring(4) : normalized;
};

export const getStoreRequestConfig = () => {
  const storeDomain = getCurrentStoreDomain();
  return storeDomain
    ? {
        headers: {
          "X-Store-Domain": storeDomain,
        },
      }
    : {};
};

export const getApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return getBuildApiBaseUrl();
  }

  return getRuntimeApiBaseUrl();
};

export const getUrl = () => {
  return `${getApiBaseUrl()}/products`;
};

export const getProducts = async () => {
  try {
    const res = await axios.get(`${getUrl()}`, getStoreRequestConfig());
    return res.data;
  } catch (e) {
    throw e;
  }
};

export const getProductsNoStore = async () => {
  try {
    const res = await axios.get(`${getApiBaseUrl()}/products/no-store`);
    return res.data;
  } catch (e) {
    throw e;
  }
};

export const getProductsById = async (id: number, url?: string) => {
  try {
    const res = await axios.get(`${getUrl()}/${id}`, getStoreRequestConfig());
    return res.data;
  } catch (e) {
    throw e;
  }
};

export const getProductsByIdNoStore = async (id: number, url?: string) => {
  try {
    const res = await axios.get(`${getApiBaseUrl()}/products/${id}/no-store`);
    return res.data;
  } catch (e) {
    throw e;
  }
};

export const getProductsByIdForDomain = async (id: number, domain: string) => {
  try {
    const normalizedDomain = normalizeStoreDomain(domain);
    const res = await axios.get(`${getApiBaseUrl()}/products/${id}`, {
      headers: normalizedDomain ? { "X-Store-Domain": normalizedDomain } : {},
    });
    return res.data;
  } catch (e) {
    throw e;
  }
};

export const getProductsPaginatedNoStore = async (
  page: number,
  url?: string,
) => {
  try {
    const res = await axios.get(
      `${getApiBaseUrl()}/products/no-store?page=${page}&size=${PAGE_SIZE}`,
    );
    return res.data;
  } catch (e) {
    throw e;
  }
};

export const getProductImageUrl = (productId: number | string, imageId?: string) => {
  const params = new URLSearchParams();
  const storeDomain = getCurrentStoreDomain();
  if (imageId) {
    params.set("imageId", imageId);
  }
  if (storeDomain) {
    params.set("storeDomain", storeDomain);
  }

  const query = params.toString();
  return `${getRuntimeApiBaseUrl()}/products/${productId}/profile-image${query ? `?${query}` : ""}`;
};

export const getCategoriesNoStore = async () => {
  try {
    const res = await axios.get(
      `${getApiBaseUrl()}/store/categories/no-store`,
    );
    return res.data;
  } catch (e) {
    throw e;
  }
};

export const getProductsPaginated = async (page: number, url?: string) => {
  try {
    const res = await axios.get(
      `${getUrl()}?page=${page}&size=${PAGE_SIZE}`,
      getStoreRequestConfig(),
    );
    return res.data;
  } catch (e) {
    throw e;
  }
};

export const getProductsByName = async (query: string, page: number) => {
  try {
    const params = new URLSearchParams({
      query,
      page: String(page),
      size: String(PAGE_SIZE),
    });
    const res = await axios.get(
      `${getUrl()}/by-name?${params.toString()}`,
      getStoreRequestConfig(),
    );
    return res.data;
  } catch (e) {
    throw e;
  }
};

export const getProductsByCategory = async (
  category: string,
  page: number,
  url?: string,
) => {
  try {
    const params = new URLSearchParams({
      category,
      page: String(page),
      size: String(PAGE_SIZE),
    });
    const endpoint =
      category === "promo"
        ? `${getUrl()}?page=0&size=${PROMO_PAGE_SIZE}`
        : `${getUrl()}/by-category?${params.toString()}`;
    const res = await axios.get(endpoint, getStoreRequestConfig());
    const data: ProductsResponse = res.data;

    if (category === "promo") {
      data.content = data.content.filter((product) => product.promo > 0);
      data.totalElements = data.content.length;
    }

    return data;
  } catch (e) {
    throw e;
  }
};

export const getProductsByCategoryNoStore = async (
  category: string,
  page: number,
  url?: string,
) => {
  try {
    const params = new URLSearchParams({
      category,
      page: String(page),
      size: String(PAGE_SIZE),
    });
    const endpoint =
      category === "promo"
        ? `${getApiBaseUrl()}/products/no-store?page=0&size=${PROMO_PAGE_SIZE}`
        : `${getApiBaseUrl()}/products/by-category/no-store?${params.toString()}`;
    const res = await axios.get(endpoint);
    const data: ProductsResponse = res.data;

    if (category === "promo") {
      data.content = data.content.filter((product) => product.promo > 0);
      data.totalElements = data.content.length;
    }

    return data;
  } catch (e) {
    throw e;
  }
};
