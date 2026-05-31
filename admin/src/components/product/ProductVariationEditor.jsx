import {
  Box,
  Button,
  FormLabel,
  Grid,
  GridItem,
  IconButton,
  Input,
  Text,
} from "@chakra-ui/react";
import { FiPlus, FiTrash } from "react-icons/fi";
import PriceInput from "./PriceInput.jsx";

const getVariationLabel = (variation = {}) => {
  if (variation.label) return variation.label;
  const options = variation.options || {};
  if (options.opcao) return options.opcao;
  return Object.entries(options)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" / ");
};

const normalizeVariation = (variation = {}) => ({
  id: variation.id,
  label: variation.label || getVariationLabel(variation),
  price: variation.price || "0,00",
  quantity: variation.quantity || "0",
  promo: variation.promo || 0,
});

export const sortSimpleVariations = (variations = []) =>
  [...variations].sort((first, second) => {
    const firstLabel = getVariationLabel(first).trim();
    const secondLabel = getVariationLabel(second).trim();

    if (!firstLabel && !secondLabel) return 0;
    if (!firstLabel) return 1;
    if (!secondLabel) return -1;

    return firstLabel.localeCompare(secondLabel, "pt-BR", {
      sensitivity: "base",
      numeric: true,
    });
  });

const ProductVariationEditor = ({ value = [], onChange }) => {
  const rows = sortSimpleVariations(
    value.map((variation, originalIndex) => ({
      ...normalizeVariation(variation),
      originalIndex,
    })),
  );

  const updateRow = (index, patch) => {
    const rowToUpdate = rows[index];
    onChange(
      value.map((row, rowIndex) =>
        rowIndex === rowToUpdate.originalIndex ? { ...row, ...patch } : row,
      ),
    );
  };

  const removeRow = (index) => {
    const rowToRemove = rows[index];
    onChange(
      value.filter((_, rowIndex) => rowIndex !== rowToRemove.originalIndex),
    );
  };

  const addRow = () => {
    onChange([
      ...rows,
      {
        label: "",
        price: "0,00",
        quantity: "0",
        promo: 0,
      },
    ]);
  };

  return (
    <Box border="1px solid #eee" borderRadius="md" p={4}>
      <Text fontWeight="semibold" mb={1}>
        Variações
      </Text>
      <Text color="gray.600" fontSize="sm" mb={4}>
        Cadastre cada opção que o cliente pode escolher, como P, M, G, Azul ou Dourado.
      </Text>

      {rows.map((row, index) => (
        <Grid
          key={index}
          templateColumns={{ base: "1fr", md: "1.4fr 1fr .7fr .7fr auto" }}
          gap={3}
          alignItems="end"
          mb={4}
        >
          <GridItem>
            <FormLabel>Opção</FormLabel>
            <Input
              value={row.label}
              placeholder="Ex: P, M, Azul, Dourado"
              borderColor="#ebe5fc"
              focusBorderColor="#5f5482"
              onChange={(event) => updateRow(index, { label: event.target.value })}
            />
          </GridItem>

          <GridItem>
            <PriceInput
              label="Preço"
              value={row.price}
              onChange={(formattedValue) => updateRow(index, { price: formattedValue })}
            />
          </GridItem>

          <GridItem>
            <FormLabel>Estoque</FormLabel>
            <Input
              type="number"
              min={0}
              value={row.quantity}
              borderColor="#ebe5fc"
              focusBorderColor="#5f5482"
              onChange={(event) => updateRow(index, { quantity: event.target.value })}
            />
          </GridItem>

          <GridItem>
            <FormLabel>Promoção (%)</FormLabel>
            <Input
              type="number"
              min={0}
              max={100}
              value={row.promo}
              borderColor="#ebe5fc"
              focusBorderColor="#5f5482"
              onChange={(event) => updateRow(index, { promo: event.target.value })}
            />
          </GridItem>

          <GridItem>
            <IconButton
              aria-label="Remover variação"
              icon={<FiTrash />}
              colorScheme="red"
              variant="ghost"
              onClick={() => removeRow(index)}
            />
          </GridItem>
        </Grid>
      ))}

      <Button leftIcon={<FiPlus />} variant="outline" color="#5f5482" onClick={addRow}>
        Adicionar opção
      </Button>
    </Box>
  );
};

export const prepareSimpleVariationsForSave = (rows = []) =>
  sortSimpleVariations(rows)
    .map(normalizeVariation)
    .filter((row) => row.label && row.label.trim())
    .map((row) => ({
      id: row.id,
      options: { opcao: row.label.trim() },
      price: row.price || "0,00",
      quantity: row.quantity || "0",
      promo: Number(row.promo || 0),
    }));

export default ProductVariationEditor;
