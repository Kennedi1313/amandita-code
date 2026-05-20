import { FormLabel, InputGroup, InputLeftAddon, Input } from "@chakra-ui/react";
import { NumericFormat } from "react-number-format";

const PriceInput = ({ label, value, onChange, name, id }) => {
  return (
    <>
      <FormLabel htmlFor={id || name}>{label}</FormLabel>
      <InputGroup focusBorderColor="#5f5482">
        <InputLeftAddon backgroundColor="#ebe5fc">R$</InputLeftAddon>
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
          borderColor="#ebe5fc"
          focusBorderColor="#5f5482"
          width="100%"
        />
      </InputGroup>
    </>
  );
};

export default PriceInput;
