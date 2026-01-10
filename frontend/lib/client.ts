import axios from 'axios';

//const API_URL = 'https://api.amanditapratas.com.br/api/v1';
const API_URL = 'http://localhost:8080/api/v1';

const getAuthConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
})

export const login = async (usernameAndPassword: any) => {
    try {
        return await axios.post(`${getUrl()}/auth/login`, usernameAndPassword )
    } catch (e) { throw e }
}

export const getCustomers = async () => {
    try {
        return await axios.get(`${getUrl()}/customers`)
    } catch (e) { throw e }
}

export const getCustomerByEmail = async (email: string) => {
    try {
        return await axios.get(`${getUrl()}/customers/email/${email}`)
    } catch (e) { throw e }
}

export const getStatusByPaymentId = async (paymentId: any) => {
    try {
        return await axios.get(`${getUrl()}/payment/status/${paymentId}`)
    } catch (e) { throw e }
}

export const saveCustomer = async (customer: any) => {
    try {
        return await axios.post(`${getUrl()}/customers`, customer)
    } catch (e) { throw e }
}

export const findAddressByCep = async (cep: string) => {
    try {
        return axios.get(`https://viacep.com.br/ws/${cep}/json/`)
    } catch (e) { throw e }
} 

export const createPreference = async (formData: any) => {
    try {
        return await axios.post(`${getUrl()}/payment/preference`, formData)
    } catch (e) { throw e }
}

export const createPayment = async (paymentData: any) => {
    try {
        const amount = parseFloat((paymentData.transaction_amount || 0).toFixed(2));
        paymentData.transaction_amount = amount;
        if (paymentData.payment_method_id == 'pix') {
            return await axios.post(`${getUrl()}/payment/pix`, paymentData, {
                headers: {
                    'Content-Type': 'application/json',
                }});
        } else {
            return await axios.post(`${getUrl()}/payment/credit-card`, paymentData, {
                headers: {
                    'Content-Type': 'application/json',
                }});
        }
    } catch (e) { throw e }
}

export const getSales = async () => {
    try {
        return await axios.get(`${getUrl()}/products/sales`)
    } catch (e) { throw e }
}

export const getSaleById = async (saleId: string) => {
    try {
        return await axios.get(`${getUrl()}/products/sales/${saleId}`)
    } catch (e) { throw e }
}

export const getSalesByCustomerEmail = async (email: string) => {
    try {
        return await axios.get(`${getUrl()}/products/sales/email/${email}`)
    } catch (e) { throw e }
}

export const updateSale = async (details: any) => {
    try {
        return await axios.post(`${getUrl()}/products/sales`, details, { ...getAuthConfig() })
    } catch (e) { throw e }
}

export const updateCustomer = async (customerId: number, updateRequest: any) => {
    try {
        return await axios.put(`${getUrl()}/customers/${customerId}`, updateRequest, { ...getAuthConfig() })
    } catch (e) { throw e }
}


export const getStoreInfo = async () => {
    try {
        return await axios.get(`${getUrl()}/store/info`);
    } catch (e) { throw e }
}

export const getStoreInfoByDomain = async (domain: string) => {
    try {
        return await axios.get(`https://api.${domain}/api/v1/store/info`);
    } catch (e) { throw e }
}

export const getUrl = () => {
    //return 'http://localhost:8080/api/v1';
    if (typeof window !== "undefined") 
        return window.location.origin.replace(/^https?:\/\/(painel\.)?/, 'https://api.') + "/api/v1";
    return "http://localhost:8080/api/v1";
}