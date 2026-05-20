import { Alert, AlertIcon, Box, FormLabel, Select } from "@chakra-ui/react";
import { useField } from "formik";

const MySelectInput = ({ label, ...props }) => {
  const [field, meta] = useField(props);
  return (
    <Box>
      <FormLabel htmlFor={props.id || props.name}>{label}</FormLabel>
      <Select {...field} {...props} />
      {meta.touched && meta.error ? (
        <Alert className="error" status={"error"} mt={2} rounded="md">
          <AlertIcon />
          {meta.error}
        </Alert>
      ) : null}
    </Box>
  );
};

export default MySelectInput;
