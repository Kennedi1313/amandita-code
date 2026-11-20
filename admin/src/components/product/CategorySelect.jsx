import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  FormLabel,
  Select,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useField } from "formik";
import { getCategoryPathLabel } from "../../utils/categoryTree.js";

const CategorySelect = ({ categories }) => {
  const [field, meta] = useField("category");
  const selectedCategory = categories.find(
    (category) => category.path.split("/").pop() === field.value,
  );

  return (
    <Box>
      <FormLabel htmlFor="category">Categoria do produto</FormLabel>
      <Select
        {...field}
        id="category"
        placeholder="Selecione onde o produto ficará na loja"
        borderColor="#e4f2d5"
        focusBorderColor="#1f633c"
      >
        {categories.map((category) => (
          <option
            key={category.id}
            value={category.path.split("/").pop()}
          >
            {getCategoryPathLabel(category, categories)}
          </option>
        ))}
      </Select>

      {meta.touched && meta.error ? (
        <Alert status="error" mt={2} rounded="md">
          <AlertIcon />
          {meta.error}
        </Alert>
      ) : null}

      {selectedCategory ? (
        <Alert status="info" mt={3} rounded="md" alignItems="flex-start">
          <AlertIcon mt={1} />
          <Stack spacing={1}>
            <Stack direction="row" align="center" flexWrap="wrap">
              <Text fontWeight="semibold">Caminho na loja:</Text>
              {selectedCategory.parentId ? (
                <Badge colorScheme="purple">Subcategoria</Badge>
              ) : (
                <Badge colorScheme="green">Categoria principal</Badge>
              )}
            </Stack>
            <Text>{getCategoryPathLabel(selectedCategory, categories)}</Text>
            <Text fontSize="sm" color="gray.600">
              O produto será encontrado dentro deste caminho de categorias.
            </Text>
          </Stack>
        </Alert>
      ) : (
        <Text mt={2} fontSize="sm" color="gray.600">
          A lista mostra o caminho completo. Exemplo: Roupas › Camisetas ›
          Feminina.
        </Text>
      )}
    </Box>
  );
};

export default CategorySelect;
