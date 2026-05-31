import { FormikProvider, useFormik } from "formik";
import * as Yup from "yup";
import {
  Box,
  Button,
  FormLabel,
  Stack,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  getProductImagesById,
  updateProduct,
} from "../../services/product-client.js";
import {
  errorNotification,
  successNotification,
} from "../../services/notification.js";
import { useEffect, useState } from "react";
import { getCategories } from "../../services/client.js";
import { FiSave } from "react-icons/fi";
import PriceInput from "./PriceInput.jsx";
import MyTextInput from "./MyTextInput.jsx";
import MySelectInput from "./MySelectInput.jsx";
import MyDropzone from "./MyDropZone.jsx";
import ProductVariationEditor, {
  prepareSimpleVariationsForSave,
} from "./ProductVariationEditor.jsx";

const UpdateProductForm = ({ fetchProducts, initialValues, productId }) => {
  let [categories, setCategories] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const [hasNewThumb, setHasNewThumb] = useState(false);
  const [variationData, setVariationData] = useState([]);
  const [productType, setProductType] = useState(
    initialValues.variations && initialValues.variations.length > 0
      ? "variable"
      : "single",
  );

  const priceToCents = (value) => Number(String(value || "").replace(/\D/g, ""));

  const validateProductBeforeSave = (updatedProduct, finalVariations) => {
    if (existingImages.length + newImages.length === 0) {
      return "Mantenha pelo menos uma imagem do produto.";
    }

    if (!updatedProduct.category) {
      return "Selecione uma categoria.";
    }

    if (productType === "single" && priceToCents(updatedProduct.price) <= 0) {
      return "Informe um preço de venda maior que zero.";
    }

    if (productType === "variable") {
      if (finalVariations.length === 0) {
        return "Adicione pelo menos uma opção de variação.";
      }

      const invalidVariation = finalVariations.find(
        (variation) => priceToCents(variation.price) <= 0,
      );
      if (invalidVariation) {
        return "Todas as variações precisam ter preço maior que zero.";
      }
    }

    return "";
  };

  useEffect(() => {
    getCategories()
      .then((res) => {
        setCategories(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  useEffect(() => {
    getProductImagesById(initialValues.id)
      .then((res) => {
        setExistingImages(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  useEffect(() => {
    if (!initialValues?.variations || initialValues.variations.length === 0) {
      setVariationData([]);
      return;
    }
    setVariationData(initialValues.variations);
  }, [initialValues]);

  const formik = useFormik({
    initialValues,
    validationSchema: Yup.object({
      name: Yup.string()
        .max(50, "O nome não pode possuir mais que 50 caracteres")
        .required("Obrigatório"),
      category: Yup.string().required("Obrigatório"),
    }),
    onSubmit: async (updatedProduct, { setSubmitting }) => {
      setSubmitting(true);

      try {
        const finalVariations =
          productType === "variable"
            ? prepareSimpleVariationsForSave(variationData)
            : [];
        const validationMessage = validateProductBeforeSave(
          updatedProduct,
          finalVariations,
        );

        if (validationMessage) {
          errorNotification("Revise o produto", validationMessage);
          setSubmitting(false);
          return;
        }

        const productData = {
          name: updatedProduct.name,
          description: updatedProduct.description,
          price: updatedProduct.price === "NaN" ? "0" : updatedProduct.price,
          promo: updatedProduct.promo,
          quantity: updatedProduct.quantity,
          category: updatedProduct.category,
          imagesToDelete: imagesToDelete,
          variations: finalVariations,
        };

        const formData = new FormData();

        formData.append(
          "product",
          new Blob([JSON.stringify(productData)], {
            type: "application/json",
          }),
        );

        newImages.forEach((file) => {
          formData.append("files", file);
        });

        await updateProduct(productId, formData);

        successNotification(
          "Produto atualizado",
          `${updatedProduct.name} foi atualizado com sucesso.`,
        );
        fetchProducts();
        setNewImages([]);
        setImagesToDelete([]);
      } catch (err) {
        console.error(err);
        errorNotification(
          err.code || "Erro",
          err.response?.data?.message || "Falha ao atualizar o produto",
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    formik.setFieldValue("variations", variationData);
  }, [variationData]);

  return (
    <FormikProvider value={formik}>
      <VStack spacing={"5"} mb={"5"}>
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
              label="Nome"
              name="name"
              borderColor="#ebe5fc"
              focusBorderColor="#5f5482"
              type="text"
            />

            <Box>
              <FormLabel htmlFor={"description"}>Descrição</FormLabel>
              <Textarea
                id="description"
                name="description"
                borderColor="#ebe5fc"
                focusBorderColor="#5f5482"
                value={formik.values.description}
                onChange={(e) =>
                  formik.setFieldValue("description", e.target.value)
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
              <option disabled value="">
                (Selecione uma categoria)
              </option>
              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.path.split("/").pop()}
                >
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
                  setProductType(value);
                }}
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
                      formik.setFieldValue("price", formattedValue);
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
                <ProductVariationEditor
                  value={variationData}
                  onChange={setVariationData}
                />
              )}
            </Stack>
          </Stack>

          <Button
            backgroundColor="#5f5482"
            color="white"
            marginTop="3rem"
            padding="1.5rem"
            type="submit"
            leftIcon={<FiSave />}
            isLoading={formik.isSubmitting}
          >
            Salvar alterações
          </Button>
        </Stack>
      </form>
    </FormikProvider>
  );
};

export default UpdateProductForm;
