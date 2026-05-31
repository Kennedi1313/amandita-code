import axios from "axios";
import { getApiBaseUrl, getStoreRequestConfig, normalizeStoreDomain } from "./productClient";

const getStoredAccessToken = () => {
  if (typeof window === "undefined") {
    return "";
  }
  return (localStorage.getItem("access_token") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
};

if (typeof window !== "undefined") {
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem("access_token");
        const currentPath = `${window.location.pathname}${window.location.search}`;
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }
      }
      return Promise.reject(error);
    },
  );
}

const getAuthConfig = () => ({
  headers: {
    ...getStoreRequestConfig().headers,
    ...(getStoredAccessToken()
      ? { Authorization: `Bearer ${getStoredAccessToken()}` }
      : {}),
  },
});

export const login = async (usernameAndPassword: any) => {
  try {
    return await axios.post(
      `${getUrl()}/auth/login`,
      usernameAndPassword,
      getStoreRequestConfig(),
    );
  } catch (e) {
    throw e;
  }
};

export const loginWithGoogle = async (credential: string) => {
  try {
    return await axios.post(
      `${getUrl()}/auth/google`,
      { credential },
      getStoreRequestConfig(),
    );
  } catch (e) {
    throw e;
  }
};

export const getCustomers = async () => {
  try {
    return await axios.get(`${getUrl()}/customers`, getStoreRequestConfig());
  } catch (e) {
    throw e;
  }
};

export const getCustomerByEmail = async (email: string) => {
  try {
    return await axios.get(
      `${getUrl()}/customers/email/${encodeURIComponent(email)}`,
      getAuthConfig(),
    );
  } catch (e) {
    throw e;
  }
};

export const getStatusByPaymentId = async (paymentId: any) => {
  try {
    return await axios.get(
      `${getUrl()}/payment/status/${paymentId}`,
      getStoreRequestConfig(),
    );
  } catch (e) {
    throw e;
  }
};

export const saveCustomer = async (customer: any) => {
  try {
    return await axios.post(
      `${getUrl()}/customers`,
      customer,
      getStoreRequestConfig(),
    );
  } catch (e) {
    throw e;
  }
};

export const findAddressByCep = async (cep: string) => {
  try {
    return axios.get(`https://viacep.com.br/ws/${cep}/json/`);
  } catch (e) {
    throw e;
  }
};

export const createPreference = async (formData: any) => {
  try {
    return await axios.post(`${getUrl()}/payment/preference`, formData);
  } catch (e) {
    throw e;
  }
};

export const createPayment = async (paymentData: any) => {
  try {
    const amount = parseFloat((paymentData.transaction_amount || 0).toFixed(2));
    paymentData.transaction_amount = amount;
    if (paymentData.payment_method_id == "pix") {
      return await axios.post(`${getUrl()}/payment/pix`, paymentData, {
        headers: {
          ...getStoreRequestConfig().headers,
          "Content-Type": "application/json",
        },
      });
    } else {
      return await axios.post(`${getUrl()}/payment/credit-card`, paymentData, {
        headers: {
          ...getStoreRequestConfig().headers,
          "Content-Type": "application/json",
        },
      });
    }
  } catch (e) {
    throw e;
  }
};

export const createAsaasCheckout = async (checkoutData: any) => {
  try {
    return await axios.post(`${getUrl()}/payment/asaas/checkout`, checkoutData, {
      headers: {
        ...getAuthConfig().headers,
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    throw e;
  }
};

export const getSales = async () => {
  try {
    return await axios.get(`${getUrl()}/products/sales`, getStoreRequestConfig());
  } catch (e) {
    throw e;
  }
};

export const getSaleById = async (saleId: string) => {
  try {
    return await axios.get(
      `${getUrl()}/products/sales/${saleId}`,
      getStoreRequestConfig(),
    );
  } catch (e) {
    throw e;
  }
};

export const getSalesByCustomerEmail = async (email: string) => {
  try {
    return await axios.get(
      `${getUrl()}/products/sales/email/${encodeURIComponent(email)}`,
      getAuthConfig(),
    );
  } catch (e) {
    throw e;
  }
};

export const updateSale = async (details: any) => {
  try {
    return await axios.post(`${getUrl()}/products/sales`, details, {
      ...getAuthConfig(),
    });
  } catch (e) {
    throw e;
  }
};

export const updateCustomer = async (
  customerId: number,
  updateRequest: any,
) => {
  try {
    return await axios.put(
      `${getUrl()}/customers/${customerId}`,
      updateRequest,
      { ...getAuthConfig() },
    );
  } catch (e) {
    throw e;
  }
};

export const getStoreInfo = async () => {
  try {
    return await axios.get(`${getUrl()}/store/info`, getStoreRequestConfig());
  } catch (e) {
    throw e;
  }
};

export const getStoreInfoByDomain = async (domain: string) => {
  try {
    return await axios.get(`${getUrl()}/store/info`, {
      headers: {
        "X-Store-Domain": normalizeStoreDomain(domain),
      },
    });
  } catch (e) {
    throw e;
  }
};

export const getUrl = () => {
  return getApiBaseUrl();
}
