import { ProductsResponse } from "@/types/ProductTypes";
import axios from "axios";

//const API_URL = 'https://api.amanditapratas.com.br/api/v1/products';
const API_URL = "http://localhost:8080/api/v1/products";
const PAGE_SIZE = 8;
const PROMO_PAGE_SIZE = 500;

export const getProducts = async () => {
  try {
    const res = await axios.get(`${getUrl()}`);
    return res.data;
  } catch (e) {
    throw e;
  }
};

export const getProductsNoStore = async () => {
  try {
    const res = await axios.get(
      `https://api.amanditapratas.com.br/api/v1/products/no-store`,
    );
    return res.data;
  } catch (e) {
    throw e;
  }
};

export const getProductsById = async (id: number, url?: string) => {
  try {
    const res = await axios.get(`${getUrl()}/${id}`);
    return res.data;
  } catch (e) {
    throw e;
  }
};

export const getProductsByIdNoStore = async (id: number, url?: string) => {
  try {
    const res = await axios.get(
      `https://api.amanditapratas.com.br/api/v1/products/${id}`,
    );
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
      `https://api.amanditapratas.com.br/api/v1/products?page=${page}&size=${PAGE_SIZE}`,
    );
    return res.data;
  } catch (e) {
    throw e;
  }
};

export const getCategoriesNoStore = async () => {
  try {
    const res = await axios.get(
      `https://api.amanditapratas.com.br/api/v1/store/categories/no-store`,
    );
    return res.data;
  } catch (e) {
    throw e;
  }
};

export const getProductsPaginated = async (page: number, url?: string) => {
  try {
    const res = await axios.get(`${getUrl()}?page=${page}&size=${PAGE_SIZE}`);
    return res.data;
  } catch (e) {
    throw e;
  }
};

export const getProductsByName = async (query: string, page: number) => {
  try {
    const res = await axios.get(
      `${getUrl()}/by-name?query=${query}&page=${page}&size=${PAGE_SIZE}`,
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
    const endpoint =
      category === "promo"
        ? `${getUrl()}?page=0&size=${PROMO_PAGE_SIZE}`
        : `${getUrl()}/by-category?category=${category}&page=${page}&size=${PAGE_SIZE}`;
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

export const getProductsByCategoryNoStore = async (
  category: string,
  page: number,
  url?: string,
) => {
  try {
    const endpoint =
      category === "promo"
        ? `https://api.amanditapratas.com.br/api/v1/products/no-store?page=0&size=${PROMO_PAGE_SIZE}`
        : `https://api.amanditapratas.com.br/api/v1/products/by-category/no-store?category=${category}&page=${page}&size=${PAGE_SIZE}`;
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

export const getUrl = () => {
  //return 'http://localhost:8080/api/v1/products';
  if (typeof window !== "undefined")
    return (
      window.location.origin.replace(
        /^https?:\/\/(painel\.)?/,
        "https://api.",
      ) + "/api/v1/products"
    );
  return "http://localhost:8080/api/v1/products";
};
