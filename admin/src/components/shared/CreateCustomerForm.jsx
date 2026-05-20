import { Form, Formik, useField } from "formik";
import * as Yup from "yup";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormLabel,
  Input,
  Select,
  Stack,
} from "@chakra-ui/react";
import { saveCustomer } from "../../services/client.js";
import {
  successNotification,
  errorNotification,
} from "../../services/notification.js";

const MyTextInput = ({ label, ...props }) => {
  // useField() returns [formik.getFieldProps(), formik.getFieldMeta()]
  // which we can spread on <input>. We can use field meta to show an error
  // message if the field is invalid and it has been touched (i.e. visited)
  const [field, meta] = useField(props);
  return (
    <Box>
      <FormLabel htmlFor={props.id || props.name}>{label}</FormLabel>
      <Input className="text-input" {...field} {...props} />
      {meta.touched && meta.error ? (
        <Alert className="error" status={"error"} mt={2}>
          <AlertIcon />
          {meta.error}
        </Alert>
      ) : null}
    </Box>
  );
};

const MySelect = ({ label, ...props }) => {
  const [field, meta] = useField(props);
  return (
    <Box>
      <FormLabel htmlFor={props.id || props.name}>{label}</FormLabel>
      <Select {...field} {...props} />
      {meta.touched && meta.error ? (
        <Alert className="error" status={"error"} mt={2}>
          <AlertIcon />
          {meta.error}
        </Alert>
      ) : null}
    </Box>
  );
};

// And now we can use these
const CreateCustomerForm = ({ onSuccess }) => {
  return (
    <>
      <Formik
        initialValues={{
          name: "",
          email: "",
          age: 18,
          gender: "MALE",
          password: "",
          cpf: "00000000000",
          zip: "00000000",
          street: "vazio",
          number: "0",
          district: "vazio",
          city: "vazio",
          reference: "vazio",
        }}
        validationSchema={Yup.object({
          name: Yup.string()
            .max(50, "Must be 50 characters or less")
            .required("Obrigatório"),
          email: Yup.string()
            .email("Digite um email válido")
            .required("Obrigatório"),
          password: Yup.string()
            .min(4, "Must be 4 characters or more")
            .max(15, "Must be 15 characters or less")
            .required("Obrigatório"),
        })}
        onSubmit={(customer, { setSubmitting }) => {
          setSubmitting(true);
          saveCustomer(customer)
            .then((res) => {
              successNotification(
                "Customer saved",
                `${customer.name} foi cadastrado com sucesso`,
              );
              onSuccess(res.headers["authorization"]);
            })
            .catch((err) => {
              console.log(err);
              errorNotification(err.response.data.message);
            })
            .finally(() => {
              setSubmitting(false);
            });
        }}
      >
        {({ isValid, isSubmitting }) => (
          <Form>
            <Stack spacing={"24px"}>
              <MyTextInput label="Nome" name="name" type="text" />

              <MyTextInput label="Email" name="email" type="email" />

              <MyTextInput
                label="Senha"
                name="password"
                type="password"
                placeholder={"********"}
              />

              <Button
                disabled={!isValid || isSubmitting}
                color={"#5f5482"}
                type="submit"
              >
                Cadastrar
              </Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </>
  );
};

export default CreateCustomerForm;
