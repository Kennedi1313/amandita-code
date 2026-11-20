import { useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  FormLabel,
  Grid,
  Icon,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { FiCheck, FiEdit2, FiPlus, FiTag, FiTrash, FiX } from "react-icons/fi";
import SidebarWithHeader from "./components/shared/SideBar.jsx";
import PageHeader from "./components/shared/PageHeader.jsx";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "./services/client.js";
import {
  errorNotification,
  successNotification,
} from "./services/notification.js";
import {
  flattenCategoryTree,
  getCategoryDescendantIds,
  getCategoryPathLabel,
} from "./utils/categoryTree.js";

const EMPTY_DEFAULTS = {
  weightKg: "",
  widthCm: "",
  heightCm: "",
  lengthCm: "",
};

const DEFAULT_FIELDS = [
  ["weightKg", "Peso (kg)"],
  ["widthCm", "Largura (cm)"],
  ["heightCm", "Altura (cm)"],
  ["lengthCm", "Comprimento (cm)"],
];

const defaultsPayload = (defaults) => Object.fromEntries(
  Object.entries(defaults).map(([key, value]) => [
    key,
    value === "" ? null : Number(value),
  ]),
);

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [newDefaults, setNewDefaults] = useState(EMPTY_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingParentId, setEditingParentId] = useState("");
  const [editingDefaults, setEditingDefaults] = useState(EMPTY_DEFAULTS);

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
      const response = await createCategory({
        name: newCategoryName.trim(),
        parentId: newParentId ? Number(newParentId) : null,
        ...defaultsPayload(newDefaults),
      });
      setCategories((current) => [...current, response.data]);
      setNewCategoryName("");
      setNewParentId("");
      setNewDefaults(EMPTY_DEFAULTS);
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

  const handleUpdateCategory = async (categoryId) => {
    if (!editingName.trim()) return;

    try {
      const response = await updateCategory(categoryId, {
        name: editingName.trim(),
        parentId: editingParentId ? Number(editingParentId) : 0,
        ...defaultsPayload(editingDefaults),
      });
      setCategories((current) => current.map((category) =>
        category.id === categoryId ? response.data : category,
      ));
      setEditingId(null);
      setEditingName("");
      successNotification("Categoria atualizada", "Os produtos também foram atualizados.");
    } catch (err) {
      errorNotification(
        err.code || "Erro",
        err.response?.data?.message || "Falha ao atualizar categoria",
      );
    }
  };

  const newParent = categories.find(
    (category) => String(category.id) === String(newParentId),
  );
  const newCategoryPath = [
    newParent ? getCategoryPathLabel(newParent, categories) : null,
    newCategoryName.trim() || "Nova categoria",
  ].filter(Boolean).join(" › ");

  if (loading) {
    return (
      <SidebarWithHeader>
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="#1f633c"
          size="xl"
        />
      </SidebarWithHeader>
    );
  }

  return (
    <SidebarWithHeader>
      <Box maxW="7xl" mx="auto" px={{ base: 0, md: 6 }} py={{ base: 3, md: 8 }}>
        <Stack spacing={6}>
          <PageHeader
            title="Categorias"
            description="Organize as categorias da sua loja."
          />

          <Box
            border="1px solid"
            borderColor="gray.100"
            borderRadius="lg"
            bg="white"
            p={{ base: 3, md: 5 }}
          >
            <Stack spacing={4}>
              <Text fontWeight="bold" fontSize="lg">Nova categoria</Text>
              <SimpleGrid columns={{ base: 1, md: "1fr 1fr auto" }} spacing={3}>
                <Input
                  value={newCategoryName}
                  placeholder="Nome da categoria"
                  aria-label="Nome da categoria"
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  focusBorderColor="#1f633c"
                />
                <Box>
                  <FormLabel mb={1} fontSize="sm" htmlFor="new-category-parent">
                    Categoria pai
                  </FormLabel>
                  <Select
                    id="new-category-parent"
                    value={newParentId}
                    onChange={(event) => setNewParentId(event.target.value)}
                    focusBorderColor="#1f633c"
                  >
                    <option value="">Sem pai (principal)</option>
                    {flattenCategoryTree(categories).map(({ category }) => (
                      <option key={category.id} value={category.id}>
                        {getCategoryPathLabel(category, categories)}
                      </option>
                    ))}
                  </Select>
                </Box>
                <Button
                  leftIcon={<FiPlus />}
                  colorScheme="brand"
                  onClick={handleAddCategory}
                  isDisabled={!newCategoryName.trim()}
                >
                  Adicionar
                </Button>
              </SimpleGrid>

              <Alert status="info" rounded="md" py={2}>
                <AlertIcon />
                <Stack spacing={0}>
                  <Text fontSize="xs" color="gray.600">CAMINHO NA LOJA</Text>
                  <Text fontWeight="semibold">{newCategoryPath}</Text>
                </Stack>
              </Alert>

              <Divider />
              <Text fontSize="sm" color="gray.600">
                Padrão de envio <Text as="span" color="gray.400">(opcional)</Text>
              </Text>
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2}>
                {DEFAULT_FIELDS.map(([key, label]) => (
                  <Input
                    key={key}
                    type="number"
                    step={key === "weightKg" ? "0.001" : "1"}
                    placeholder={label}
                    aria-label={label}
                    value={newDefaults[key]}
                    onChange={(event) => setNewDefaults({
                      ...newDefaults,
                      [key]: event.target.value,
                    })}
                  />
                ))}
              </SimpleGrid>
            </Stack>
          </Box>

          <Stack spacing={2}>
            {categories.length === 0 ? (
              <Box
                border="1px solid"
                borderColor="gray.100"
                borderRadius="lg"
                bg="white"
                p={8}
                textAlign="center"
              >
                <Icon as={FiTag} boxSize={8} color="#1f633c" />
                <Text mt={3} fontWeight="bold">Nenhuma categoria cadastrada</Text>
              </Box>
            ) : (
              flattenCategoryTree(categories).map(({ category, depth }) => {
                const categoryId = String(category.id);
                const parent = categories.find(
                  (item) => String(item.id) === String(category.parentId),
                );
                const childCount = categories.filter(
                  (item) => String(item.parentId) === categoryId,
                ).length;
                const descendantIds = getCategoryDescendantIds(category.id, categories);
                const canBeParent = categories.filter((item) =>
                  String(item.id) !== categoryId
                  && !descendantIds.has(String(item.id)),
                );
                const selectedEditParent = categories.find(
                  (item) => String(item.id) === String(editingParentId),
                );
                const editPreview = [
                  selectedEditParent
                    ? getCategoryPathLabel(selectedEditParent, categories)
                    : null,
                  editingName.trim() || category.name,
                ].filter(Boolean).join(" › ");

                return (
                  <Grid
                    key={category.id}
                    templateColumns={{ base: "1fr", md: "minmax(180px, 1fr) auto" }}
                    gap={3}
                    alignItems="center"
                    border="1px solid"
                    borderColor="gray.100"
                    borderLeftWidth={depth ? "4px" : "1px"}
                    borderLeftColor={depth ? "purple.200" : "gray.100"}
                    borderRadius="md"
                    bg="white"
                    p={3}
                    ml={{ base: 0, md: `${depth * 20}px` }}
                  >
                    {editingId === category.id ? (
                      <Stack spacing={3}>
                        <Input
                          size="sm"
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          aria-label="Nome da categoria"
                          autoFocus
                        />
                        <Box>
                          <FormLabel mb={1} fontSize="sm" htmlFor={`parent-${category.id}`}>
                            Categoria pai
                          </FormLabel>
                          <Select
                            id={`parent-${category.id}`}
                            size="sm"
                            value={editingParentId}
                            onChange={(event) => setEditingParentId(event.target.value)}
                          >
                            <option value="">Sem pai (principal)</option>
                            {flattenCategoryTree(canBeParent).map(({ category: option }) => (
                              <option key={option.id} value={option.id}>
                                {getCategoryPathLabel(option, categories)}
                              </option>
                            ))}
                          </Select>
                        </Box>
                        <Alert status="info" rounded="md" py={2}>
                          <AlertIcon />
                          <Stack spacing={0}>
                            <Text fontSize="xs" color="gray.600">CAMINHO NA LOJA</Text>
                            <Text fontWeight="semibold">{editPreview}</Text>
                          </Stack>
                        </Alert>
                        <SimpleGrid columns={2} spacing={1}>
                          {DEFAULT_FIELDS.map(([key, label]) => (
                            <Input
                              key={key}
                              size="sm"
                              type="number"
                              placeholder={label}
                              aria-label={label}
                              value={editingDefaults[key] ?? ""}
                              onChange={(event) => setEditingDefaults({
                                ...editingDefaults,
                                [key]: event.target.value,
                              })}
                            />
                          ))}
                        </SimpleGrid>
                      </Stack>
                    ) : (
                      <Stack
                        spacing={1}
                        pl={{ base: 0, md: depth ? 2 : 0 }}
                        minW={0}
                      >
                        <Flex gap={2} align="center" flexWrap="wrap">
                          <Text fontWeight="semibold">{category.name}</Text>
                          <Badge colorScheme={parent ? "purple" : "green"}>
                            {parent ? "Subcategoria" : "Principal"}
                          </Badge>
                          {childCount > 0 && (
                            <Badge colorScheme="gray">
                              {childCount} {childCount === 1 ? "filha" : "filhas"}
                            </Badge>
                          )}
                        </Flex>
                        <Text color="gray.500" fontSize="sm" noOfLines={2}>
                          {getCategoryPathLabel(category, categories)}
                        </Text>
                      </Stack>
                    )}

                    <Flex
                      direction="row"
                      justify="space-between"
                      align="center"
                      w="100%"
                      gap={1}
                    >
                      {editingId === category.id ? (
                        <>
                          <Button
                            size="sm"
                            colorScheme="green"
                            variant="ghost"
                            leftIcon={<FiCheck />}
                            onClick={() => handleUpdateCategory(category.id)}
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<FiX />}
                            onClick={() => {
                              setEditingId(null);
                              setEditingName("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          colorScheme="brand"
                          variant="ghost"
                          leftIcon={<FiEdit2 />}
                          onClick={() => {
                            setEditingId(category.id);
                            setEditingName(category.name);
                            setEditingParentId(category.parentId ? String(category.parentId) : "");
                            setEditingDefaults({
                              weightKg: category.weightKg ?? "",
                              widthCm: category.widthCm ?? "",
                              heightCm: category.heightCm ?? "",
                              lengthCm: category.lengthCm ?? "",
                            });
                          }}
                        >
                          Editar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        leftIcon={<FiTrash />}
                        display={{
                          base: editingId === category.id ? "none" : "inline-flex",
                          md: "inline-flex",
                        }}
                        isDisabled={editingId === category.id}
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        Remover
                      </Button>
                    </Flex>
                  </Grid>
                );
              })
            )}
          </Stack>
        </Stack>
      </Box>
    </SidebarWithHeader>
  );
};

export default Categories;
