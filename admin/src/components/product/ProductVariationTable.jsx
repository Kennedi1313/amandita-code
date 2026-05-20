import {
  Box,
  Input,
  Text,
  Flex,
  FormLabel,
  Stack,
  AccordionButton,
  AccordionItem,
  Accordion,
  Tag,
  AccordionIcon,
  AccordionPanel,
} from "@chakra-ui/react";
import { useMemo } from "react";
import PriceInput from "./PriceInput";

const buildKey = (options = {}) =>
  Object.entries(options)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("|");

const getComboKey = (comb) => buildKey(comb);

const upsertVariationByKey = (prevArray, key, patch) => {
  let found = false;
  const updated = prevArray.map((item) => {
    const itemKey = buildKey(item.options || {});
    if (itemKey === key) {
      found = true;
      return { ...item, ...patch };
    }
    return item;
  });

  if (!found) {
    // cria um objeto newVariation com options vindo do key
    const options = Object.fromEntries(
      key.split("|").map((pair) => {
        const [k, v] = pair.split("=");
        return [k, v];
      }),
    );
    updated.push({ options, ...patch });
  }

  return updated;
};

const prepareVariationsForSave = (generatedCombos, variationData) => {
  // cria um map para lookup rápido
  const map = {};
  variationData.forEach((v) => {
    const key = buildKey(v.options || {});
    map[key] = v;
  });

  // percorre generatedCombos e monta a array final na ordem correta
  return generatedCombos.map((comb) => {
    const key = getComboKey(comb);
    const existing = map[key];

    if (existing) {
      // garante o formato que o banco espera (aqui mantenho strings em price como você tem)
      return {
        ...existing,
        options: comb,
        price: existing.price ?? "0",
        quantity: existing.quantity ?? 0,
        promo: existing.promo ?? 0,
      };
    }

    return {
      options: comb,
      price: "0",
      quantity: 0,
      promo: 0,
    };
  });
};

const ProductVariationTable = ({
  variationData = [],
  generatedCombos = [],
  setVariationData,
}) => {
  const variationMap = useMemo(() => {
    const m = {};
    variationData.forEach((v) => {
      const key = buildKey(v.options || {});
      m[key] = v;
    });
    return m;
  }, [variationData]);

  const handleChange = (key, field, value) => {
    const patch = {};
    if (field === "price") {
      patch.price = typeof value === "number" ? value.toString() : value;
    } else if (field === "quantity") {
      patch.quantity = value;
    } else if (field === "promo") {
      patch.promo = value;
    } else {
      patch[field] = value;
    }

    setVariationData((prev) => upsertVariationByKey(prev, key, patch));
  };

  return (
    <Box mt={6} p={4} mb={3} border="1px solid #eee">
      <Text fontWeight="bold" mb={4}>
        Combinações geradas
      </Text>

      {generatedCombos.length === 0 && (
        <Text color="gray.500">
          Nenhuma combinação possível. Adicione valores nas variações.
        </Text>
      )}

      <Accordion allowMultiple defaultIndex={[]}>
        {generatedCombos.map((comb) => {
          const comboKey = getComboKey(comb);
          const comboData = variationMap[comboKey] || {
            options: comb,
            price: "0",
            quantity: 0,
            promo: 0,
          };

          const valid =
            Number(comboData.price) > 0 || Number(comboData.quantity) > 0;

          return (
            <AccordionItem
              key={comboKey}
              border="1px solid #eee"
              borderRadius="md"
              mb={3}
            >
              <h2>
                <AccordionButton _expanded={{ bg: "purple.50" }}>
                  <Flex
                    justify="space-between"
                    align="center"
                    flex="1"
                    textAlign="left"
                    gap={2}
                  >
                    <Text fontWeight="semibold">
                      {Object.entries(comb)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" + ")}
                    </Text>

                    <Tag
                      py={2}
                      minW="fit-content"
                      size="sm"
                      colorScheme={valid ? "green" : "gray"}
                      variant={valid ? "solid" : "subtle"}
                    >
                      {valid ? "Válida" : "Incompleta"}
                    </Tag>
                  </Flex>
                  <AccordionIcon />
                </AccordionButton>
              </h2>

              <AccordionPanel>
                <Stack spacing={3} p={2}>
                  <PriceInput
                    label="Preço de venda"
                    name={`price-${comboKey}`}
                    width="100px"
                    value={comboData.price}
                    onChange={(v) => handleChange(comboKey, "price", v)}
                  />

                  <FormLabel htmlFor={`promo-${comboKey}`}>
                    Promoção (%)
                  </FormLabel>
                  <Input
                    id={`promo-${comboKey}`}
                    type="number"
                    value={comboData.promo}
                    onChange={(e) =>
                      handleChange(comboKey, "promo", e.target.value)
                    }
                  />

                  <FormLabel htmlFor={`quantity-${comboKey}`}>
                    Quantidade em estoque
                  </FormLabel>
                  <Input
                    id={`quantity-${comboKey}`}
                    type="number"
                    value={comboData.quantity}
                    onChange={(e) =>
                      handleChange(comboKey, "quantity", e.target.value)
                    }
                  />
                </Stack>
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>
    </Box>
  );
};

export default ProductVariationTable;

// --- export helper to use when saving product (example) ---
// usage:
// const payloadVariations = prepareVariationsForSave(generatedCombos, variationData);
// send payloadVariations to backend
export { prepareVariationsForSave };
