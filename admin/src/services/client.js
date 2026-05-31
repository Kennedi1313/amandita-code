import axios from "axios";

const getStoredAccessToken = () =>
  (localStorage.getItem("access_token") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

const getAuthConfig = () => ({
  headers: {
    ...getStoreHeaders(),
    ...(getStoredAccessToken()
      ? { Authorization: `Bearer ${getStoredAccessToken()}` }
      : {}),
  },
});

export const getStoreDomain = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("store_domain") || "";
};

export const getStoreHeaders = () => {
  const storeDomain = getStoreDomain();
  return storeDomain ? { "X-Store-Domain": storeDomain } : {};
};

export const getStoreConfig = () => {
  const token = getStoredAccessToken();

  return {
    headers: {
      ...getStoreHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

export const getCustomers = async () => {
  try {
    return await axios.get(`${getUrl()}/api/v1/customers`, getStoreConfig());
  } catch (e) {
    throw e;
  }
};

export const saveCustomer = async (customer) => {
  try {
    return await axios.post(
      `${getUrl()}/api/v1/customers`,
      customer,
      getAuthConfig(),
    );
  } catch (e) {
    throw e;
  }
};

export const updateCustomer = async (id, update) => {
  try {
    return await axios.put(
      `${getUrl()}/api/v1/customers/${id}`,
      update,
      getAuthConfig(),
    );
  } catch (e) {
    throw e;
  }
};

export const deleteCustomer = async (id) => {
  try {
    return await axios.delete(
      `${getUrl()}/api/v1/customers/${id}`,
      getAuthConfig(),
    );
  } catch (e) {
    throw e;
  }
};

export const login = async (usernameAndPassword) => {
  try {
    return await axios.post(
      `${getUrl()}/api/v1/auth/admin/login`,
      usernameAndPassword,
    );
  } catch (e) {
    throw e;
  }
};

export const loginWithGoogle = async (credential) => {
  try {
    return await axios.post(`${getUrl()}/api/v1/auth/admin/google`, {
      credential,
    });
  } catch (e) {
    throw e;
  }
};

export const uploadCustomerProfilePicture = async (id, formData) => {
  try {
    return axios.post(
      `${getUrl()}/api/v1/customers/${id}/profile-image`,
      formData,
      { ...getAuthConfig(), "Content-Type": "multipart/form-data" },
    );
  } catch (e) {
    throw e;
  }
};

export const getCategories = async () => {
  try {
    return await axios.get(
      `${getUrl()}/api/v1/store/categories`,
      getStoreConfig(),
    );
  } catch (e) {
    throw e;
  }
};

export const createCategory = async (name) => {
  try {
    return await axios.post(
      `${getUrl()}/api/v1/store/categories`,
      { name },
      getAuthConfig(),
    );
  } catch (e) {
    throw e;
  }
};

export const updateCategory = async (id, name) => {
  try {
    return await axios.put(
      `${getUrl()}/api/v1/store/categories/${id}`,
      { name },
      getAuthConfig(),
    );
  } catch (e) {
    throw e;
  }
};

export const deleteCategory = async (id) => {
  try {
    return await axios.delete(
      `${getUrl()}/api/v1/store/categories/${id}`,
      getAuthConfig(),
    );
  } catch (e) {
    throw e;
  }
};

export const getStoreInfo = async () => {
  try {
    const response = await axios.get(`${getUrl()}/api/v1/store/info`, getStoreConfig());
    if (response.data?.domain) {
      localStorage.setItem("store_domain", response.data.domain);
    }
    return response;
  } catch (e) {
    throw e;
  }
};

export const getStorefrontUrl = (domain) => {
  if (!domain) {
    return "";
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `http://${domain === "localhost" ? "localhost" : domain}:3000`;
    }
  }

  return `https://${domain}`;
};

export const updateStoreInfo = async (store) => {
  try {
    return await axios.put(`${getUrl()}/api/v1/store/info`, store, {
      ...getAuthConfig(),
    });
  } catch (e) {
    throw e;
  }
};

export const uploadStoreImage = async (type, file) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    return await axios.post(`${getUrl()}/api/v1/store/images/${type}`, formData, {
      ...getAuthConfig(),
      headers: {
        ...getAuthConfig().headers,
        ...getStoreHeaders(),
        "Content-Type": "multipart/form-data",
      },
    });
  } catch (e) {
    throw e;
  }
};

export const customerProfilePictureUrl = (id) =>
  `${getUrl()}/api/v1/customers/${id}/profile-image`;

const DEFAULT_ADMIN_API_BUILD_URL = "http://amandita-api:8080";
const DEFAULT_ADMIN_API_RUNTIME_URL = "http://localhost:8080";

export const getUrl = () => {
  const buildUrl = import.meta.env.VITE_API_BUILD_URL;
  const runtimeUrl = import.meta.env.VITE_API_RUNTIME_URL;

  if (typeof window !== "undefined") {
    if (runtimeUrl) {
      return runtimeUrl.replace(/\/+$/, "");
    }
    return buildUrl
      ? buildUrl.replace(/\/+$/, "")
      : DEFAULT_ADMIN_API_RUNTIME_URL;
  }

  return buildUrl
    ? buildUrl.replace(/\/+$/, "")
    : DEFAULT_ADMIN_API_BUILD_URL;
}
