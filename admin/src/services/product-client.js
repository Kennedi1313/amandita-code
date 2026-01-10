import axios from 'axios';
import { getUrl } from './client';

const getAuthConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`
    }
})

export const getProducts = async (currentPage) => {
    try {
        return await axios.get(
            `${getUrl()}/api/v1/products?page=${currentPage}&size=${8}`
        )
    } catch (e) {
        throw e;
    }
}

export const getSales = async () => {
    try {
        return await axios.get(
            `${getUrl()}/api/v1/products/sales`
        )
    } catch (e) {
        throw e;
    }
}

export const updateSale = async (details) => {
    try {
        return await axios.post(
            `${getUrl()}/api/v1/products/sales`,
            details,
            {
                ...getAuthConfig()
            }
        )
    } catch (e) {
        throw e;
    }
}

export const getProductsByCategory = async (category, currentPage) => {
    try {
        return await axios.get(
            `${getUrl()}/api/v1/products/by-category?category=${category}&page=${currentPage}&size=${8}`
        )
    } catch (e) {
        throw e;
    }
}

export const fetchCustomerByCPF = async (cpf) => {
    try {
        return await axios.get(
            `${getUrl()}/api/v1/customers/cpf/${cpf}`
        )
    } catch (e) {
        throw e;
    }
}

export const sell = async (details) => {
    try {
        return await axios.post(
            `${getUrl()}/api/v1/products/sell`,
            details,
            {
                ...getAuthConfig()
            }
        )
    } catch (e) {
        throw e;
    }
}

export const saveProduct = async (product, image) => {
    try {
        let productId = await axios.post(
            `${getUrl()}/api/v1/products`,
                product,
                {
                    ...getAuthConfig()
                }
        );
        if (image) {
            const formData = new FormData();
            formData.append("file", image);
            await axios.post(
                `${getUrl()}/api/v1/products/${productId.data}/profile-image`,
                formData,
                {
                    ...getAuthConfig(),
                    'Content-Type': 'multipart/form-data'
                }
            )
        }
    } catch (e) {
        throw e;
    }
}

export const saveProductMultiImage = async (formData) => {
    try {
        // Faz a requisição única para o endpoint que lida tanto com o cadastro do produto
        // quanto com o upload das imagens
        console.log("savprodcutMultiImage called");
        console.log(formData)
        const response = await axios.post(
            `${getUrl()}/api/v1/products/with-images`,
            formData,
            {
                ...getAuthConfig(),
                headers: {
                'Content-Type': 'multipart/form-data',
                }
            }
        );

        return response.data; // Pode ser o productId ou os dados do produto criado
    } catch (e) {
        throw e;
    }
};

export const updateProduct = async (id, update) => {
    try {
        console.log(update);
        return await axios.put(
            `${getUrl()}/api/v1/products/${id}`,
            update,
            {
                ...getAuthConfig(),
                'Content-Type': 'multipart/form-data'
            }
        )
    } catch (e) {
        throw e;
    }
}

export const deleteProduct = async (id) => {
    try {
        return await axios.delete(
            `${getUrl()}/api/v1/products/${id}`,
            {
                ...getAuthConfig()
            }
        )
    } catch (e) {
        throw e;
    }
}
export const uploadProductPicture = async (id, formData) => {
    try {
        return axios.post(
            `${getUrl()}/api/v1/products/${id}/profile-image`,
            formData,
            {
                ...getAuthConfig(),
                'Content-Type' : 'multipart/form-data'
            }
        );
    } catch (e) {
        throw e;
    }
}

export const getProductImagesById = async (id) => {
    try {
        return axios.get(
            `${getUrl()}/api/v1/products/${id}/images`,
        )
    } catch (e) {
        throw e;
    }
}

export const productsPictureUrl = (id) =>
    `${getUrl()}/api/v1/products/${id}/profile-image`;
