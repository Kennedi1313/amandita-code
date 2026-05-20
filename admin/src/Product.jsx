import {
  Spinner,
  Text,
  Input,
  Button,
  Stack,
  Flex,
  Box,
  Select,
  Alert,
  AlertIcon,
  SimpleGrid,
} from "@chakra-ui/react";
import SidebarWithHeader from "./components/shared/SideBar.jsx";
import { useEffect, useState } from "react";
import {
  getProducts,
  getProductsByCategory,
} from "./services/product-client.js";
import CardWithImage from "./components/product/ProductCard.jsx";
import { errorNotification } from "./services/notification.js";
import CreateProductDrawer from "./components/product/CreateProductDrawer.jsx";
import { Field, Form, Formik } from "formik";
import axios from "axios";
import Pagination from "./components/product/Pagination.jsx";
import { usePagination } from "./components/context/PaginationContext.jsx";
import { getCategories, getUrl } from "./services/client.js";

const Product = () => {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("");
  const [productsWithSearch, setProductsWithSearch] = useState(products);
  const [loading, setLoading] = useState(false);
  const [err, setError] = useState("");
  const [productListSize, setProductListSize] = useState(0);
  const { currentPage, setCurrentPage } = usePagination();
  let [categories, setCategories] = useState([]);

  const fetchProducts = () => {
    setLoading(true);
    let response;
    if (category === "") {
      response = getProducts(currentPage);
    } else {
      response = getProductsByCategory(category, currentPage);
    }
    response
      .then((res) => {
        setProducts(res.data.content);
        setProductsWithSearch(res.data.content);
        setProductListSize(res.data.totalElements);
      })
      .catch((err) => {
        setError(err.response.data.message);
        errorNotification(err.code, err.response.data.message);
      })
      .finally(() => {
        setLoading(false);
      });
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
    fetchProducts();
  }, [category, currentPage]);

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setProducts([]);
    setProductsWithSearch([]);
  };

  if (loading) {
    return (
      <SidebarWithHeader>
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="blue.500"
          size="xl"
        />
      </SidebarWithHeader>
    );
  }

  return (
    <SidebarWithHeader>
      <Box
        width={"full"}
        maxWidth={{ base: "full", lg: "container.lg" }}
        mx="auto"
      >
        {/* Always Visible Category Filter */}
        <Box paddingTop={"24px"} paddingBottom={"8px"}>
          <Text fontWeight={"semibold"} fontSize={"4xl"}>
            Produtos
          </Text>
        </Box>

        <Flex
          flexDirection={{ base: "column", md: "row" }}
          justify={"space-between"}
          gap={"1rem"}
        >
          <CreateProductDrawer fetchProducts={fetchProducts} />

          <Box>
            <Select
              id="category"
              focusBorderColor="#5f5482"
              borderColor="#ebe5fc"
              onChange={handleCategoryChange}
              value={category}
              placeholder="Categorias"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.path.split("/").pop()}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </Box>

          <Formik
            initialValues={{ search: "" }}
            onSubmit={async (data) => {
              try {
                const response = await axios.get(
                  `${getUrl()}/api/v1/products/by-name`,
                  {
                    params: {
                      query: data.search,
                      page: 0,
                      size: 8,
                    },
                  },
                );
                setCurrentPage(0);
                setProductListSize(response.data.totalElements);
                setProductsWithSearch(response.data.content || []);
              } catch (error) {
                console.error("Erro ao buscar produtos:", error);
              }
            }}
          >
            <Form>
              <Stack
                width={"full"}
                display={"flex"}
                flexDirection={"row"}
                justify={"center"}
                gap={"2"}
                align={"center"}
              >
                <Field name={"search"} type="text">
                  {({ field }) => (
                    <Input
                      {...field}
                      type="text"
                      focusBorderColor="#5f5482"
                      borderColor="#ebe5fc"
                      placeholder="Pesquisar por nome"
                    />
                  )}
                </Field>
                <Button
                  type="submit"
                  backgroundColor="#ebe5fc"
                  color={"#5f5482"}
                  style={{ margin: "0", padding: "1.2rem" }}
                >
                  Pesquisar
                </Button>
              </Stack>
            </Form>
          </Formik>
        </Flex>

        {/* Error Alert */}
        {err && (
          <Alert status="error" mt={4}>
            <AlertIcon />
            {err}
          </Alert>
        )}

        {/* No Products Display */}
        {products.length <= 0 && !loading && !err && (
          <Text mt={5}>Nenhum produto cadastrado para esta categoria.</Text>
        )}

        {/* Products Display */}
        <Text marginTop={"8px"} textColor={"#5f5482"} fontWeight={"semibold"}>
          {productListSize} produtos
        </Text>
        <SimpleGrid
          columns={{ base: 2, md: 3, lg: 4 }}
          spacing={"6px"}
          justifyItems="center"
        >
          {productsWithSearch.map((product, index) => (
            <CardWithImage
              key={index}
              {...product}
              imageNumber={index}
              fetchProducts={fetchProducts}
            />
          ))}
        </SimpleGrid>
        <Pagination
          className="pagination-bar"
          currentPage={currentPage}
          totalCount={productListSize}
          pageSize={8}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </Box>
    </SidebarWithHeader>
  );
};

export default Product;
