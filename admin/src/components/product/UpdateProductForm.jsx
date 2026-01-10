import {Field, Form, Formik, FormikProvider, useField, useFormik} from 'formik';
import * as Yup from 'yup';
import {
    Alert,
    AlertIcon,
    Box,
    Button,
    FormLabel,
    Image,
    Input,
    Select,
    Stack,
    Textarea,
    VStack
} from "@chakra-ui/react";
import {getProductImagesById, productsPictureUrl, saveProduct, updateProduct, uploadProductPicture} from "../../services/product-client.js";
import {errorNotification, successNotification} from "../../services/notification.js";
import {useCallback, useEffect, useState} from "react";
import {useDropzone} from "react-dropzone";
import CurrencyInput from "react-currency-input-field";
import { getCategories } from '../../services/client.js';
import { FiSave } from 'react-icons/fi';
import PriceInput from './PriceInput.jsx';
import MyTextInput from './MyTextInput.jsx';
import MySelectInput from './MySelectInput.jsx';
import MyDropzone from './MyDropZone.jsx';
import ProductVariationTable, { prepareVariationsForSave } from './ProductVariationTable.jsx';
import ProductVariations from './ProductVariations.jsx';

const predefinedVariations = [
    { name: "cor", options: ["Azul", "Vermelho", "Verde"] },
    { name: "tamanho", options: ["P", "M", "G"] }
];

const generateCombinations = (selectedVariations) => {
    const variationNames = Object.keys(selectedVariations)
        .filter((key) => Array.isArray(selectedVariations[key]) && selectedVariations[key].length > 0)
        .sort(); // 🔥 garante ordem estável para geração da chave

    if (variationNames.length === 0) return [];

    const optionsArrays = variationNames.map((name) =>
        selectedVariations[name].map((value) => ({ [name]: value }))
    );

    const cartesian = (arr) =>
        arr.reduce(
            (acc, curr) =>
                acc.flatMap((a) => curr.map((b) => ({ ...a, ...b }))),
            [{}]
        );

    return cartesian(optionsArrays);
};


const UpdateProductForm = ({fetchProducts, initialValues, productId}) => {

    let [categories, setCategories] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [newImages, setNewImages] = useState([]);
    const [imagesToDelete, setImagesToDelete] = useState([]);
    const [hasNewThumb, setHasNewThumb] = useState(false);
    // Variações
    const [selectedVariations, setSelectedVariations] = useState({});
    const [generatedCombos, setGeneratedCombos] = useState([]);
    const [variationData, setVariationData] = useState([]);
    const [productType, setProductType] = useState(initialValues.variations &&
                                    initialValues.variations.length > 0
                                        ? 'variable'
                                        : 'single');

    useEffect(() => {
        getCategories().then((res) => {
            setCategories(res.data)
        }).catch(err => {console.log(err)})
    }, []);

    useEffect(() => {
        getProductImagesById(initialValues.id).then((res) => {
            setExistingImages(res.data)
        }).catch(err => {console.log(err)})
    }, []);

    useEffect(() => {
        console.log(initialValues)
        if (!initialValues?.variations || initialValues.variations.length === 0) {
            setGeneratedCombos([]);
            setVariationData([]);
            return;
        }

        const selected = {};
        const vData = [];

        initialValues.variations.forEach((v, index) => {
            selected[v.options.name];

            vData.push({
                options: v.options,
                price: v.price,
                quantity: v.quantity,
                promo: v.promo
            });

            Object.entries(v.options).forEach(([k, val]) => {
                if (!selected[k]) selected[k] = [];
                if (!selected[k].includes(val)) selected[k].push(val);
            });
        });

        setSelectedVariations(prev => ({
            ...selected
        }));

        const combos = generateCombinations(selected);
        setGeneratedCombos(combos);
        setVariationData(vData);
        
    }, [initialValues]);

    const formik = useFormik({
        initialValues,
        validationSchema: Yup.object({
            name: Yup.string()
                .max(50, 'Must be 50 characters or less')
                .required('Required'),
        }),
        onSubmit: async (updatedProduct, { setSubmitting }) => {
            setSubmitting(true);

            try {

                const finalVariations = prepareVariationsForSave(generatedCombos, variationData);
                const productData = {
                    name: updatedProduct.name,
                    description: updatedProduct.description,
                    price: updatedProduct.price === "NaN" ? "0" : updatedProduct.price,
                    promo: updatedProduct.promo,
                    quantity: updatedProduct.quantity,
                    category: updatedProduct.category,
                    imagesToDelete: imagesToDelete,
                    variations: finalVariations 
                };

                console.log("Dados do produto a serem enviados:", productData);

                const formData = new FormData();

                formData.append(
                    "product",
                    new Blob([JSON.stringify(productData)], {
                        type: "application/json",
                    })
                );

                newImages.forEach((file) => {
                    formData.append("files", file);
                });

                await updateProduct(productId, formData);

                successNotification(
                    "Produto atualizado",
                    `${updatedProduct.name} foi atualizado com sucesso.`
                );
                fetchProducts();

            } catch (err) {
                console.error(err);
                errorNotification(
                    err.code || "Erro",
                    err.response?.data?.message || "Falha ao atualizar o produto"
                );
            } finally {
                setSubmitting(false);
            }
        }
    });

    useEffect(() => {
        formik.setFieldValue("variations", variationData);
    }, [variationData]);

    return (
        <FormikProvider value={formik}>
            <VStack spacing={'5'} mb={'5'}>
                <MyDropzone
                    existingImages={existingImages}
                    setExistingImages={setExistingImages}
                    newImages={newImages}
                    setNewImages={setNewImages}
                    setImagesToDelete={setImagesToDelete}
                    setHasNewThumb={setHasNewThumb}
                />
            </VStack>

            <form onSubmit={formik.handleSubmit}>
                <Stack spacing={"3rem"}>

                    {/* CAMPOS BÁSICOS */}
                    <Stack p={4} border="1px solid #eee" borderRadius="md">
                        <MyTextInput
                            label="Name"
                            name="name"
                            borderColor="#ebe5fc"
                            focusBorderColor="#5f5482"
                            type="text"
                        />

                        <Box>
                            <FormLabel htmlFor={'description'}>Descrição</FormLabel>
                            <Textarea
                                id="description"
                                name="description"
                                borderColor="#ebe5fc"
                                focusBorderColor="#5f5482"
                                value={formik.values.description}
                                onChange={(e) =>
                                    formik.setFieldValue('description', e.target.value)
                                }
                            />
                        </Box>

                        <MySelectInput
                            label="Categoria"
                            name="category"
                            marginBottom={"3rem"}
                            borderColor="#ebe5fc"
                            focusBorderColor="#5f5482"
                        >
                            <option disabled value="">(Selecione uma categoria)</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.path.split("/").pop()}>
                                    {category.name}
                                </option>
                            ))}
                        </MySelectInput>
                    </Stack>

                    {/* VARIAÇÕES */}
                    <Stack marginBottom={"3rem"}>
                        <Stack p={4} border="1px solid #eee" borderRadius="md">
                            <MySelectInput
                                label="Tipo de produto"
                                name="productType"
                                borderColor="#ebe5fc"
                                focusBorderColor="#5f5482"
                                mb={5}
                                value={productType}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setProductType(value);}}
                            >
                                <option value="single">Produto único</option>
                                <option value="variable">Produto com variações</option>
                            </MySelectInput>

                            {productType === "single" && (
                                <>
                                    <PriceInput
                                        label="Preço de venda"
                                        width="100px"
                                        value={formik.values.price}
                                        onChange={(formattedValue) => {
                                            formik.setFieldValue('price', formattedValue);
                                        }}
                                    />

                                    <MyTextInput
                                        label="Promoção (%)"
                                        name="promo"
                                        type="number"
                                        placeholder="0"
                                    />

                                    <MyTextInput
                                        label="Quantidade em estoque"
                                        name="quantity"
                                        type="number"
                                        placeholder="0"
                                    />
                                </>
                            )} 
                            
                            {productType === "variable" && (
                                <ProductVariations
                                    predefinedVariations={predefinedVariations}
                                    value={selectedVariations}
                                    onChange={(obj) => {
                                        setGeneratedCombos(generateCombinations(obj));
                                    }}
                                />
                            )}
                        </Stack>

                        {productType === "variable" && (
                            <ProductVariationTable
                                generatedCombos={generatedCombos}
                                variationData={variationData}
                                setVariationData={setVariationData}
                            />
                        )}
                    </Stack>

                    <Button
                        backgroundColor="#5f5482"
                        color="white"
                        marginTop="3rem"
                        padding="1.5rem"
                        type="submit"
                        leftIcon={<FiSave />}
                    >
                        Salvar alterações
                    </Button>
                </Stack>
            </form>
        </FormikProvider>
    );
};

export default UpdateProductForm;
