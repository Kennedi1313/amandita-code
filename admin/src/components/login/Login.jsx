import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormLabel,
  Heading,
  Image,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { Formik, Form, useField } from "formik";
import * as Yup from "yup";
import { useAuth } from "../context/AuthContext.jsx";
import { errorNotification } from "../../services/notification.js";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const BRAND_PURPLE = "#5F5482";
const BRAND_PURPLE_DARK = "#4d426d";
const BRAND_PURPLE_LIGHT = "#75699b";

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

const LoginForm = () => {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || document.querySelector("#google-identity-script")) {
      setGoogleReady(Boolean(window.google));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-identity-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!googleReady || !GOOGLE_CLIENT_ID || !window.google || !googleButtonRef.current) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (!response?.credential) {
          return;
        }

        loginWithGoogle(response.credential)
          .then(() => navigate("/dashboard"))
          .catch((err) => {
            errorNotification(
              err.code,
              err.response?.data?.message || "Não foi possível entrar com Google.",
            );
          });
      },
    });

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      shape: "rectangular",
      text: "continue_with",
      width: googleButtonRef.current.offsetWidth || 360,
      locale: "pt-BR",
    });
  }, [googleReady, loginWithGoogle, navigate]);

  return (
    <Stack mt={6} spacing={5}>
      {GOOGLE_CLIENT_ID && <Box minH="44px" ref={googleButtonRef} />}

      {GOOGLE_CLIENT_ID && (
        <Flex align="center" gap={3} color="#8a8295" fontSize="sm">
          <Box flex={1} h="1px" bg="#e6deef" />
          <Text>ou entre com email</Text>
          <Box flex={1} h="1px" bg="#e6deef" />
        </Flex>
      )}

      <Formik
        validateOnMount={true}
        validationSchema={Yup.object({
          username: Yup.string()
            .email("Informe um email valido")
            .required("Email é obrigatório"),
          password: Yup.string()
            .max(20, "A senha não pode ter mais de 20 caracteres")
            .required("Senha é obrigatória"),
        })}
        initialValues={{ username: "", password: "" }}
        onSubmit={(values, { setSubmitting }) => {
          setSubmitting(true);
          login(values)
            .then(() => {
              navigate("/dashboard");
            })
            .catch((err) => {
              errorNotification(
                err.code,
                err.response?.data?.message || "Não foi possível entrar.",
              );
            })
            .finally(() => {
              setSubmitting(false);
            });
        }}
      >
        {({ isValid, isSubmitting }) => (
          <Form>
            <Stack spacing={4}>
              <MyTextInput
                label={"Email"}
                name={"username"}
                type={"email"}
                placeholder={"exemplo@exemplo.com"}
              />
              <MyTextInput
                label={"Senha"}
                name={"password"}
                type={"password"}
                placeholder={"Senha"}
              />

              <Button
                type={"submit"}
                bg={BRAND_PURPLE}
                color={"white"}
                _hover={{ bg: BRAND_PURPLE_DARK }}
                disabled={!isValid || isSubmitting}
              >
                Entrar
              </Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </Stack>
  );
};

const Login = () => {
  const { customer } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const handoff = params.get("handoff");

    if (handoff) {
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (customer) {
      navigate("/dashboard/customers");
    }
  }, [customer, navigate]);

  return (
    <Stack
      minH={"100vh"}
      background={`linear-gradient(145deg, ${BRAND_PURPLE_DARK}, ${BRAND_PURPLE}, ${BRAND_PURPLE_LIGHT})`}
      direction={{ base: "column", md: "row" }}
    >
      <Flex p={8} flex={1} alignItems={"center"} justifyContent={"center"}>
        <Stack spacing={4} w={"full"} maxW={"md"}>
          <Flex alignSelf="center" align="center" gap={3} color="white">
            <Image
              src="/icon_sem_fundo.png"
              alt="Mostra Digital"
              boxSize="56px"
              objectFit="contain"
            />
            <Heading fontSize="2xl" fontWeight="semibold">
              Mostra Digital
            </Heading>
          </Flex>
          <Stack
            backgroundColor={"rgba(255,255,255,0.98)"}
            color={BRAND_PURPLE_DARK}
            padding={"2rem"}
            rounded={"2xl"}
            boxShadow={"0 24px 70px rgba(25, 15, 40, 0.18)"}
          >
            <Heading fontSize={"2xl"} mb={15}>
              Entrar na sua conta
            </Heading>
            <LoginForm />
          </Stack>
        </Stack>
      </Flex>
    </Stack>
  );
};

export default Login;
