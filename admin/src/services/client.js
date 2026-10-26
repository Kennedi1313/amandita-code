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

export const getCustomerByEmail = async (email) => {
  return axios.get(
    `${getUrl()}/api/v1/customers/email/${encodeURIComponent(email)}`,
    getAuthConfig(),
  );
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

export const getStorePlan = async () =>
  axios.get(`${getUrl()}/api/v1/store/plan`, getStoreConfig());

export const startStoreSubscription = async (payerEmail) =>
  axios.post(`${getUrl()}/api/v1/store/plan/subscription`, { payerEmail }, getAuthConfig());

export const syncStoreSubscription = async () =>
  axios.post(`${getUrl()}/api/v1/store/plan/subscription/sync`, {}, getAuthConfig());

export const cancelStoreSubscription = async () =>
  axios.delete(`${getUrl()}/api/v1/store/plan/subscription`, getAuthConfig());

export const switchStoreToFree = async () =>
  axios.post(`${getUrl()}/api/v1/store/plan/subscription/free`, {}, getAuthConfig());

export const createCategory = async (category) => {
  try {
    return await axios.post(
      `${getUrl()}/api/v1/store/categories`,
      category,
      getAuthConfig(),
    );
  } catch (e) {
    throw e;
  }
};

export const updateCategory = async (id, category) => {
  try {
    return await axios.put(
      `${getUrl()}/api/v1/store/categories/${id}`,
      category,
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
    const response = await axios.get(`${getUrl()}/api/v1/store/settings`, getStoreConfig());
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

export const deleteStore = async () =>
  axios.delete(`${getUrl()}/api/v1/store`, getAuthConfig());

export const findAddressByCep = async (cep) => {
  const normalizedCep = String(cep || "").replace(/\D/g, "");
  if (!/^\d{8}$/.test(normalizedCep)) {
    throw new Error("Informe um CEP válido com 8 números.");
  }
  return axios.get(`https://viacep.com.br/ws/${normalizedCep}/json/`);
};

export const createAsaasSubaccount = async (details) =>
  axios.post(
    `${getUrl()}/api/v1/store/asaas/subaccount`,
    details,
    getAuthConfig(),
  );

export const getMercadoPagoConnectUrl = async () =>
  axios.get(`${getUrl()}/api/v1/store/mercadopago/connect`, getAuthConfig());

export const getMelhorEnvioAuthorizeUrl = async () =>
  axios.get(`${getUrl()}/api/v1/melhorenvio/authorize-url`, getAuthConfig());

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
    const browserRuntimeUrl = runtimeUrl || DEFAULT_ADMIN_API_RUNTIME_URL;
    const localRuntimeUrl = /^https?:\/\/(?:localhost|127(?:\.\d{1,3}){3})(?::(\d+))?$/i.exec(
      browserRuntimeUrl,
    );

    if (localRuntimeUrl) {
      return `${window.location.protocol}//${window.location.hostname}:${localRuntimeUrl[1] || "8080"}`;
    }

    return browserRuntimeUrl.replace(/\/+$/, "");
  }

  return buildUrl
    ? buildUrl.replace(/\/+$/, "")
    : DEFAULT_ADMIN_API_BUILD_URL;
}
