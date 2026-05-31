import { FormikProvider } from "formik";
import * as Yup from "yup";
import {
  Box,
  Button,
  FormLabel,
  Stack,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { saveProductMultiImage } from "../../services/product-client.js";
import {
  successNotification,
  errorNotification,
} from "../../services/notification.js";
import { useEffect, useState } from "react";
import { useFormik } from "formik";
import { getCategories } from "../../services/client.js";
import { FiPlus } from "react-icons/fi";
import PriceInput from "../product/PriceInput.jsx";
import MyTextInput from "../product/MyTextInput.jsx";
import MySelectInput from "../product/MySelectInput.jsx";
import MyDropzone from "../product/MyDropZone.jsx";
import ProductVariationEditor, {
  prepareSimpleVariationsForSave,
} from "../product/ProductVariationEditor.jsx";

const CreateProductForm = ({ fetchProducts }) => {
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const [hasNewThumb, setHasNewThumb] = useState(false);
  const [categories, setCategories] = useState([]);
  const [variationData, setVariationData] = useState([]);

  const priceToCents = (value) => Number(String(value || "").replace(/\D/g, ""));

  const validateProductBeforeSave = (product, finalVariations) => {
    if (newImages.length === 0) {
      return "Adicione pelo menos uma imagem do produto.";
    }

    if (!product.category) {
      return "Selecione uma categoria.";
    }

    if (product.productType === "single" && priceToCents(product.price) <= 0) {
      return "Informe um preço de venda maior que zero.";
    }

    if (product.productType === "variable") {
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

  const formik = useFormik({
    initialValues: {
      name: "",
      description: "",
      originalPrice: "",
      price: "0",
      quantity: "0",
      category: "",
      promo: "0",
      productType: "single",
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .max(50, "O nome não pode possuir mais que 50 caracteres")
        .required("Obrigatório"),
      category: Yup.string().required("Obrigatório"),
    }),
    onSubmit: (product, { setSubmitting, resetForm }) => {
      setSubmitting(true);
      const finalVariations =
        product.productType === "variable"
          ? prepareSimpleVariationsForSave(variationData)
          : [];
      const validationMessage = validateProductBeforeSave(
        product,
        finalVariations,
      );

      if (validationMessage) {
        errorNotification("Revise o produto", validationMessage);
        setSubmitting(false);
        return;
      }

      const productData = {
        name: product.name,
        description: product.description,
        price: product.price === "NaN" ? "0" : product.price,
        promo: product.promo,
        quantity: product.quantity,
        category: product.category,
        productType: product.productType,
        variations: finalVariations,
      };

      const formData = new FormData();
      formData.append(
        "product",
        new Blob([JSON.stringify(productData)], { type: "application/json" }),
      );
      newImages.forEach((file) => {
        formData.append("files", file);
      });

      saveProductMultiImage(formData)
        .then((res) => {
          successNotification(
            "Produto salvo",
            `${product.name} foi salvo com sucesso!`,
          );
          fetchProducts();
          resetForm();
          setNewImages([]);
          setExistingImages([]);
          setImagesToDelete([]);
          setVariationData([]);
        })
        .catch((err) => {
          console.log(err);
          errorNotification(
            err.code,
            err.response?.data?.message || "Erro ao salvar o produto",
          );
        })
        .finally(() => {
          setSubmitting(false);
        });
    },
  });

  return (
    <>
      <FormikProvider value={formik}>
        <VStack mb={"5"}>
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
          <Stack gap={"3rem"}>
            <Stack p={4} border="1px solid #eee" borderRadius="md">
              <MyTextInput
                label="Nome"
                name="name"
                type="text"
                borderColor="#ebe5fc"
                focusBorderColor="#5f5482"
              />

              <Box>
                <FormLabel htmlFor={"description"}>Descrição</FormLabel>
                <Textarea
                  id="description"
                  name="description"
                  focusBorderColor="#5f5482"
                  borderColor="#ebe5fc"
                  value={formik.values.description}
                  onChange={(e) =>
                    formik.setFieldValue("description", e.target.value)
                  }
                />
              </Box>

              <MySelectInput
                label="Categoria"
                name="category"
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

            <Stack marginBottom={"3rem"}>
              <Stack p={4} border="1px solid #eee" borderRadius="md">
                <MySelectInput
                  label="Tipo de produto"
                  name="productType"
                  borderColor="#ebe5fc"
                  focusBorderColor="#5f5482"
                  mb={5}
                >
                  <option value="single">Produto único</option>
                  <option value="variable">Produto com variações</option>
                </MySelectInput>

                {/* Só mostra os inputs gerais se não tiver variações */}
                {formik.values.productType === "single" && (
                  <>
                    <PriceInput
                      label="Preço de venda"
                      name="price"
                      value={formik.values.price}
                      onChange={(formattedValue) => {
                        formik.setFieldValue("price", formattedValue);
                      }}
                    />

                    <MyTextInput
                      label="Promoção (%)"
                      name="promo"
                      type="number"
                      borderColor="#ebe5fc"
                      focusBorderColor="#5f5482"
                      placeholder="0"
                    />

                    <MyTextInput
                      label="Quantidade em estoque"
                      name="quantity"
                      type="number"
                      borderColor="#ebe5fc"
                      focusBorderColor="#5f5482"
                      placeholder="0"
                    />
                  </>
                )}

                {formik.values.productType === "variable" && (
                  <ProductVariationEditor
                    value={variationData}
                    onChange={setVariationData}
                  />
                )}
              </Stack>
            </Stack>

            <Button
              backgroundColor="#5f5482"
              color={"white"}
              marginTop={"3rem"}
              padding={"1.5rem"}
              type="submit"
              leftIcon={<FiPlus />}
              isLoading={formik.isSubmitting}
            >
              Cadastrar produto
            </Button>
          </Stack>
        </form>
      </FormikProvider>
    </>
  );
};

export default CreateProductForm;
