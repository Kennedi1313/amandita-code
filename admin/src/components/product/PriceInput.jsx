import { FormLabel, InputGroup, InputLeftAddon, Input } from "@chakra-ui/react";
import { NumericFormat } from "react-number-format";

const PriceInput = ({ label, value, onChange, name, id }) => {
  return (
    <>
      <FormLabel htmlFor={id || name}>{label}</FormLabel>
      <InputGroup focusBorderColor="#1f633c">
        <InputLeftAddon backgroundColor="#e4f2d5">R$</InputLeftAddon>
        <Input
          as={NumericFormat}
          name={name}
          id={id}
          value={value}
          onValueChange={(vals) => {
            onChange(vals.formattedValue, vals.value);
          }}
          thousandSeparator="."
          decimalSeparator=","
          decimalScale={2}
          fixedDecimalScale
          allowNegative={false}
          placeholder="Digite o preço de venda do produto"
          borderColor="#e4f2d5"
          focusBorderColor="#1f633c"
          width="100%"
        />
      </InputGroup>
    </>
  );
};

export default PriceInput;
