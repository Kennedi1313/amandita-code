import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Flex,
  IconButton,
  Text,
  Tag,
  TagLabel,
  TagCloseButton,
  Select,
} from "@chakra-ui/react";
import { FiTrash, FiPlus } from "react-icons/fi";

const ProductVariations = ({ predefinedVariations, value, onChange }) => {
  const [variations, setVariations] = useState(() => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      return Object.entries(value).map(([name, options]) => ({
        name,
        options: Array.isArray(options) ? options : [],
      }));
    }
    return [];
  });

  useEffect(() => {
    if (!value || value.length === 0) return;
    const incoming = Array.isArray(value)
      ? value
      : Object.entries(value).map(([name, options]) => ({
          name,
          options: Array.isArray(options) ? options : [],
        }));

    if (JSON.stringify(incoming) !== JSON.stringify(variations)) {
      setVariations(incoming);
    }
  }, [value]);

  useEffect(() => {
    const obj = {};
    variations.forEach((v) => {
      if (v.name) {
        // Mantém a variação mesmo que options esteja vazia
        obj[v.name] = v.options;
      }
    });
    console.log("variations changed, calling onChange with", obj);
    onChange(obj);
  }, [variations]);

  const handleVariationChange = (index, newName) => {
    setVariations((prev) => {
      const updated = [...prev];
      const prevObj = updated[index];
      const newOptions = prevObj.name === newName ? prevObj.options : [];
      updated[index] = { name: newName, options: newOptions };
      return updated;
    });
  };

  const addVariation = () => {
    setVariations((v) => [...v, { name: "", options: [] }]);
  };

  const removeVariation = (index) => {
    setVariations((v) => v.filter((_, i) => i !== index));
  };

  const addOption = (index, opt) => {
    setVariations((prev) => {
      const updated = [...prev];
      const opts = updated[index].options;
      if (!opts.includes(opt)) updated[index].options = [...opts, opt];
      return updated;
    });
  };

  const removeOption = (vIndex, option) => {
    setVariations((prev) => {
      const updated = [...prev];
      updated[vIndex].options = updated[vIndex].options.filter(
        (o) => o !== option,
      );
      return updated;
    });
  };

  return (
    <Box>
      <Text fontWeight="semibold" mb={2}>
        Configure as variações do produto
      </Text>

      {variations.map((variation, index) => (
        <Box
          key={`var-${index}`}
          borderRadius="md"
          p={4}
          mb={3}
          border="1px solid #eee"
        >
          <Flex align="center" mb={4} gap={4}>
            <Select
              placeholder="Selecione uma variação"
              value={variation.name}
              onChange={(e) => handleVariationChange(index, e.target.value)}
            >
              {predefinedVariations
                .filter(
                  (v) =>
                    !variations.some((vr) => vr.name === v.name) ||
                    variation.name === v.name,
                )
                .map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name.charAt(0).toUpperCase() + v.name.slice(1)}
                  </option>
                ))}
            </Select>

            <IconButton
              icon={<FiTrash />}
              colorScheme="red"
              onClick={() => removeVariation(index)}
            />
          </Flex>

          {variation.name && (
            <>
              <Text fontWeight="semibold" mb={2}>
                Valores para {variation.name}
              </Text>

              <Flex wrap="wrap" gap={2} mb={4}>
                {variation.options.map((option, optIndex) => (
                  <Tag key={`opt-${index}-${optIndex}`} colorScheme="purple">
                    <TagLabel>{option}</TagLabel>
                    <TagCloseButton
                      onClick={() => removeOption(index, option)}
                    />
                  </Tag>
                ))}
              </Flex>

              <Select
                placeholder="Adicionar valor"
                onChange={(e) => addOption(index, e.target.value)}
              >
                {predefinedVariations
                  .find((v) => v.name === variation.name)
                  ?.options.filter((opt) => !variation.options.includes(opt))
                  .map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
              </Select>
            </>
          )}
        </Box>
      ))}

      <Button
        leftIcon={<FiPlus />}
        colorScheme="blue"
        onClick={addVariation}
        mt={4}
      >
        Adicionar variação
      </Button>
    </Box>
  );
};

export default ProductVariations;
