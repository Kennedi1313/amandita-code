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
  Icon,
} from "@chakra-ui/react";
import SidebarWithHeader from "./components/shared/SideBar.jsx";
import PageHeader from "./components/shared/PageHeader.jsx";
import { useEffect, useState } from "react";
import {
  getProducts,
  getProductsByCategory,
  getProductsByName,
} from "./services/product-client.js";
import CardWithImage from "./components/product/ProductCard.jsx";
import { errorNotification } from "./services/notification.js";
import CreateProductDrawer from "./components/product/CreateProductDrawer.jsx";
import { Field, Form, Formik } from "formik";
import Pagination from "./components/product/Pagination.jsx";
import { usePagination } from "./components/context/PaginationContext.jsx";
import { getCategories } from "./services/client.js";
import { FiPackage, FiSearch } from "react-icons/fi";

const Product = () => {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [productsWithSearch, setProductsWithSearch] = useState(products);
  const [loading, setLoading] = useState(false);
  const [err, setError] = useState("");
  const [productListSize, setProductListSize] = useState(0);
  const { currentPage, setCurrentPage } = usePagination();
  let [categories, setCategories] = useState([]);

  const fetchProducts = () => {
    setLoading(true);
    let response;
    if (searchTerm.trim()) {
      response = getProductsByName(searchTerm.trim(), currentPage);
    } else if (category === "") {
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
        const message =
          err.response?.data?.message || "Falha ao carregar produtos";
        setError(message);
        errorNotification(err.code || "Erro", message);
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
  }, [category, searchTerm, currentPage]);

  const handleCategoryChange = (e) => {
    setCurrentPage(0);
    setCategory(e.target.value);
    setSearchTerm("");
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
      <Box maxW="7xl" mx="auto" px={{ base: 0, md: 6 }} py={{ base: 3, md: 8 }}>
        <PageHeader
          title="Produtos"
          description="Cadastre, filtre e mantenha estoque, preço e imagens da vitrine."
        >
          <CreateProductDrawer fetchProducts={fetchProducts} />
        </PageHeader>

        <Flex
          flexDirection={{ base: "column", md: "row" }}
          justify={"space-between"}
          gap={"1rem"}
          mb={4}
        >
          <Box>
            <Select
              id="category"
              focusBorderColor="#1f633c"
              borderColor="brand.400"
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
              setCurrentPage(0);
              setCategory("");
              setSearchTerm(data.search);
            }}
          >
            <Form>
              <Stack
                width={"full"}
                display={"flex"}
                flexDirection={{ base: "column", sm: "row" }}
                justify={"center"}
                gap={"2"}
                align={"center"}
              >
                <Field name={"search"} type="text">
                  {({ field }) => (
                    <Input
                      {...field}
                      type="text"
                      focusBorderColor="#1f633c"
                      borderColor="brand.400"
                      placeholder="Pesquisar por nome"
                    />
                  )}
                </Field>
                <Button
                  type="submit"
                  colorScheme="brand"
                  width={{ base: "full", sm: "max-content" }}
                  style={{ margin: "0", padding: "1.2rem 2rem" }}
                >
                  Pesquisar
                </Button>
                {searchTerm && (
                  <Button
                    type="button"
                    variant="ghost"
                    color={"#1f633c"}
                    style={{ margin: "0", padding: "1.2rem 2rem" }}
                    onClick={() => {
                      setCurrentPage(0);
                      setSearchTerm("");
                    }}
                  >
                    Limpar
                  </Button>
                )}
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
        {productsWithSearch.length <= 0 && !loading && !err && (
          <Box
            mt={6}
            border="1px solid"
            borderColor="gray.100"
            borderRadius="md"
            bg="white"
            p={{ base: 4, md: 10 }}
            textAlign="center"
          >
            <Icon
              as={searchTerm || category ? FiSearch : FiPackage}
              boxSize={10}
              color="#1f633c"
            />
            <Text mt={3} fontWeight="bold" fontSize="xl">
              {searchTerm || category
                ? "Nenhum produto encontrado"
                : "Sua vitrine ainda está vazia"}
            </Text>
            <Text mt={1} color="gray.500">
              {searchTerm || category
                ? "Tente limpar os filtros ou buscar por outro nome."
                : "Cadastre seu primeiro produto com nome, fotos, preço e estoque."}
            </Text>
            {(searchTerm || category) && (
              <Button
                mt={4}
                variant="outline"
                colorScheme="brand"
                onClick={() => {
                  setCurrentPage(0);
                  setCategory("");
                  setSearchTerm("");
                }}
              >
                Limpar filtros
              </Button>
            )}
          </Box>
        )}

        {/* Products Display */}
        <Text marginY={"8px"} textColor={"#1f633c"} fontWeight={"semibold"}>
          {productListSize} produtos
        </Text>
        {productsWithSearch.length > 0 && (
          <>
            <SimpleGrid
              columns={{ base: 1, sm: 2, lg: 3, xl: 4 }}
              spacing={4}
              alignItems="stretch"
            >
              {productsWithSearch.map((product) => (
                <CardWithImage
                  key={product.id}
                  {...product}
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
          </>
        )}
      </Box>
    </SidebarWithHeader>
  );
};

export default Product;
