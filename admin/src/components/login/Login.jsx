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
const BRAND_GREEN = "#1f633c";
const BRAND_GREEN_DARK = "#082f1e";
const BRAND_GREEN_LIGHT = "#81c44c";

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
          password: Yup.string().required("Senha é obrigatória"),
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
                bg={BRAND_GREEN}
                color={"white"}
                _hover={{ bg: BRAND_GREEN_DARK }}
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
    <Flex minH="100vh" bg="white" direction={{ base: "column", lg: "row" }}>
      <Flex
        flex={{ base: "none", lg: "1" }}
        minH={{ base: "210px", lg: "100vh" }}
        p={{ base: 6, md: 10, lg: 14 }}
        direction="column"
        justify="space-between"
        color="white"
        bg={`linear-gradient(145deg, ${BRAND_GREEN_DARK}, ${BRAND_GREEN}, ${BRAND_GREEN_LIGHT})`}
        position="relative"
        overflow="hidden"
        _after={{
          content: '""',
          position: "absolute",
          width: "420px",
          height: "420px",
          borderRadius: "full",
          border: "1px solid",
          borderColor: "whiteAlpha.200",
          right: "-180px",
          bottom: "-200px",
          boxShadow:
            "0 0 0 40px rgba(255,255,255,0.04), 0 0 0 80px rgba(255,255,255,0.03)",
        }}
      >
        <Flex align="center" gap={3} position="relative" zIndex={1}>
          <Image
            src="/brand-mark.png"
            alt="KIZI"
            boxSize="65px"
            objectFit="contain"
            rounded="full"
          />
          <Heading fontSize="3xl" fontWeight="bold">
            KIZI
          </Heading>
        </Flex>
        <Stack
          display={{ base: "none", lg: "flex" }}
          spacing={5}
          maxW="480px"
          pb={10}
          position="relative"
          zIndex={1}
        >
          <Text
            color="whiteAlpha.800"
            fontSize="sm"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
          >
            Seu negócio, em movimento
          </Text>
          <Heading fontSize={{ lg: "4xl", xl: "5xl" }} lineHeight="1.08">
            Tudo da sua loja em um só lugar.
          </Heading>
          <Text color="whiteAlpha.800" fontSize="lg" lineHeight="tall">
            Acompanhe pedidos, organize seus produtos e cuide da sua operação
            com mais clareza.
          </Text>
        </Stack>
      </Flex>
      <Flex
        flex="1"
        align="center"
        justify="center"
        p={{ base: 5, md: 10 }}
        bg="gray.50"
      >
        <Stack spacing={6} w="full" maxW="md">
          <Box
            bg="white"
            color="gray.800"
            p={{ base: 6, md: 9 }}
            rounded="2xl"
            border="1px solid"
            borderColor="gray.100"
            boxShadow="0 24px 70px rgba(25, 15, 40, 0.08)"
          >
            <Text color="brand.600" fontSize="sm" fontWeight="semibold" mb={2}>
              Bem-vindo de volta
            </Text>
            <Heading fontSize="2xl" mb={2}>
              Acesse sua conta
            </Heading>
            <Text color="gray.500" fontSize="sm">
              Entre para continuar gerenciando sua loja.
            </Text>
            <LoginForm />
          </Box>
          <Text color="gray.500" fontSize="xs" textAlign="center">
            Acesso seguro para lojistas KIZI
          </Text>
        </Stack>
      </Flex>
    </Flex>
  );
};

export default Login;
