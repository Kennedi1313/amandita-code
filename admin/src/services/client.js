import axios from 'axios';

const getAuthConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`
    }
})

export const getCustomers = async () => {
    try {
        return await axios.get(`${getUrl()}/api/v1/customers`)
    } catch (e) { throw e }
}

export const saveCustomer = async (customer) => {
    try {
        return await axios.post(
            `${getUrl()}/api/v1/customers`,
            customer)
    } catch (e) { throw e }
}

export const updateCustomer = async (id, update) => {
    try {
        return await axios.put(
            `${getUrl()}/api/v1/customers/${id}`,
            update,
            getAuthConfig())
    } catch (e) { throw e }
}

export const deleteCustomer = async (id) => {
    try {
        return await axios.delete(
            `${getUrl()}/api/v1/customers/${id}`,
            getAuthConfig() )
    } catch (e) { throw e }
}

export const login = async (usernameAndPassword) => {
    try {
        return await axios.post(
            `${getUrl()}/api/v1/auth/login`,
            usernameAndPassword )
    } catch (e) { throw e }
}

export const uploadCustomerProfilePicture = async (id, formData) => {
    try {
        return axios.post(
            `${getUrl()}/api/v1/customers/${id}/profile-image`,
            formData,
            { ...getAuthConfig(), 'Content-Type' : 'multipart/form-data' } )
    } catch (e) { throw e }
}

export const getCategories = async () => {
    try {
        return await axios.get(`${getUrl()}/api/v1/store/categories`)
    } catch (e) { throw e }
}

export const customerProfilePictureUrl = (id) =>
    `${getUrl()}/api/v1/customers/${id}/profile-image`;

export const getUrl = () => {
    //return 'http://localhost:8080';
    if (typeof window !== "undefined") 
        return window.location.origin.replace(/^https?:\/\/(painel\.)?/, 'https://api.');
    return 'https://api.amanditapratas.com.br';
}
