import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Grid,
  Icon,
  Input,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { FiPlus, FiTag, FiTrash } from "react-icons/fi";
import SidebarWithHeader from "./components/shared/SideBar.jsx";
import PageHeader from "./components/shared/PageHeader.jsx";
import {
  createCategory,
  deleteCategory,
  getCategories,
} from "./services/client.js";
import {
  errorNotification,
  successNotification,
} from "./services/notification.js";

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      const response = await getCategories();
      setCategories(response.data || []);
    } catch (err) {
      errorNotification(
        err.code || "Erro",
        err.response?.data?.message || "Falha ao carregar categorias",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const response = await createCategory(newCategoryName.trim());
      setCategories((current) => [...current, response.data]);
      setNewCategoryName("");
      successNotification("Categoria criada", "A vitrine já usa essa categoria.");
    } catch (err) {
      errorNotification(
        err.code || "Erro",
        err.response?.data?.message || "Falha ao criar categoria",
      );
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      setCategories((current) =>
        current.filter((category) => category.id !== categoryId),
      );
      await deleteCategory(categoryId);
      successNotification("Categoria removida", "Ela não aparece mais no menu.");
    } catch (err) {
      fetchCategories();
      errorNotification(
        err.code || "Erro",
        err.response?.data?.message || "Falha ao remover categoria",
      );
    }
  };

  if (loading) {
    return (
      <SidebarWithHeader>
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="#5f5482"
          size="xl"
        />
      </SidebarWithHeader>
    );
  }

  return (
    <SidebarWithHeader>
      <Box maxW="7xl" mx="auto" px={{ base: 2, md: 6 }} py={{ base: 4, md: 8 }}>
        <Stack spacing={6}>
          <PageHeader
            title="Categorias"
            description="Organize o menu da loja e as opções usadas no cadastro de produtos."
          />

          <Box
            border="1px solid"
            borderColor="gray.100"
            borderRadius="lg"
            bg="white"
            p={{ base: 4, md: 5 }}
          >
            <Stack spacing={4}>
              <SimpleGrid columns={{ base: 1, md: "1fr auto" }} spacing={3}>
                <Input
                  value={newCategoryName}
                  placeholder="Nome da nova categoria"
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  focusBorderColor="#5f5482"
                />
                <Button
                  leftIcon={<FiPlus />}
                  backgroundColor="#5f5482"
                  color="white"
                  onClick={handleAddCategory}
                >
                  Adicionar
                </Button>
              </SimpleGrid>
              <Text color="gray.500" fontSize="sm">
                O endereço da categoria é criado automaticamente.
              </Text>
            </Stack>
          </Box>

          <Stack spacing={2} marginBottom={6}>
            {categories.length === 0 && (
              <Box
                border="1px solid"
                borderColor="gray.100"
                borderRadius="lg"
                bg="white"
                p={8}
                textAlign="center"
              >
                <Icon as={FiTag} boxSize={8} color="#5f5482" />
                <Text mt={3} fontWeight="bold">
                  Nenhuma categoria cadastrada
                </Text>
                <Text color="gray.500">
                  Crie categorias para facilitar a navegação da vitrine.
                </Text>
              </Box>
            )}

            {categories.map((category) => (
              <Grid
                key={category.id}
                templateColumns={{
                  base: "1fr",
                  md: "minmax(180px, 1fr) minmax(120px, 220px) auto",
                }}
                gap={2}
                alignItems="center"
                border="1px solid"
                borderColor="gray.100"
                borderRadius="md"
                bg="white"
                p={2}
              >
                <Text fontWeight="semibold" px={2} noOfLines={1}>
                  {category.name}
                </Text>
                <Text
                  color="gray.500"
                  fontSize="sm"
                  noOfLines={1}
                  px={{ base: 2, md: 0 }}
                >
                  {category.path}
                </Text>
                <Stack
                  direction="row"
                  justify={{ base: "stretch", md: "end" }}
                  spacing={1}
                >
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    leftIcon={<FiTrash />}
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    Remover
                  </Button>
                </Stack>
              </Grid>
            ))}
          </Stack>
        </Stack>
      </Box>
    </SidebarWithHeader>
  );
};

export default Categories;
