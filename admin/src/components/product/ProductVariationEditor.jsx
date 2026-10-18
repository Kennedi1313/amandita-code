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
import { useEffect, useRef, useState } from "react";
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

const ProductVariationEditor = ({ value = [], onChange }) => {
  // Editing must be isolated from the order returned by Formik/API. The API
  // stores variations in a Set, so its iteration order is not an editing
  // order. Keeping a local draft prevents a parent re-render from moving or
  // remounting the input while the user is typing.
  const [draftRows, setDraftRows] = useState(() => value.map(normalizeVariation));
  const hydratedFromParent = useRef(value.length > 0);

  useEffect(() => {
    if (!hydratedFromParent.current && value.length > 0) {
      setDraftRows(value.map(normalizeVariation));
      hydratedFromParent.current = true;
    }
  }, [value]);

  const rows = draftRows;

  const updateRow = (index, patch) => {
    const nextRows = rows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row,
    );
    setDraftRows(nextRows);
    onChange(nextRows);
  };

  const removeRow = (index) => {
    const nextRows = rows.filter((_, rowIndex) => rowIndex !== index);
    setDraftRows(nextRows);
    onChange(nextRows);
  };

  const addRow = () => {
    const nextRows = [
      ...rows,
      {
        label: "",
        price: "0,00",
        quantity: "0",
        promo: 0,
      },
    ];
    setDraftRows(nextRows);
    onChange(nextRows);
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
          key={row.id || `editor-row-${index}`}
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
              borderColor="#e4f2d5"
              focusBorderColor="#1f633c"
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
              borderColor="#e4f2d5"
              focusBorderColor="#1f633c"
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
              borderColor="#e4f2d5"
              focusBorderColor="#1f633c"
              onChange={(event) => updateRow(index, { promo: event.target.value })}
            />
          </GridItem>

          <GridItem>
            <IconButton
              type="button"
              aria-label="Remover variação"
              icon={<FiTrash />}
              colorScheme="red"
              variant="ghost"
              onClick={() => removeRow(index)}
            />
          </GridItem>
        </Grid>
      ))}

      <Button type="button" leftIcon={<FiPlus />} variant="outline" colorScheme="brand" onClick={addRow}>
        Adicionar opção
      </Button>
    </Box>
  );
};

export const prepareSimpleVariationsForSave = (rows = []) =>
  rows
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
