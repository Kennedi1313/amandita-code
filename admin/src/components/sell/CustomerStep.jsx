import React, { useState, useEffect } from "react";
import {
  Stack,
  Input,
  Button,
  FormLabel,
  Box,
  Text,
  useToast,
  Flex,
} from "@chakra-ui/react";
import SidebarWithHeader from "../shared/SideBar";
import { fetchCustomerByCPF } from "../../services/product-client";
import { saveCustomer } from "../../services/client";

export const cpfMask = (value) => {
  if (!value) return "";
  value = value.replace(/\D/g, ""); // Remove any non-digit characters
  value = value.replace(/(\d{3})(\d)/, "$1.$2"); // Add a dot after the first 3 digits
  value = value.replace(/(\d{3})(\d)/, "$1.$2"); // Add a dot after the next 3 digits
  value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2"); // Add a hyphen before the last 2 digits
  return value;
};

const CustomerStep = ({ setStep, onCustomerSelected, initialCustomer }) => {
  const [cpf, setCpf] = useState(initialCustomer.cpf);
  const [customer, setCustomer] = useState(initialCustomer);
  const [isRegistered, setIsRegistered] = useState(initialCustomer.cpf != "");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSearchCustomer = async () => {
    setLoading(true);
    try {
      const response = await fetchCustomerByCPF(cpf);
      if (response.status === 200 && response.data) {
        const foundCustomer = response.data;
        setCustomer({
          name: foundCustomer.name || "",
          email: foundCustomer.email || "",
          cpf: foundCustomer.cpf || "",
          phone: foundCustomer.phone || "",
          password: null, // leave as empty
          age: null, // leave as null
          gender: null, // leave as null,
          role: "ROLE_CUSTOMER",
        });
        setIsRegistered(true);
      }
    } catch (error) {
      if (error.response.status == 404) {
        toast({
          title: "Cliente não encontrado.",
          description: "Você pode registrar um novo cliente.",
          status: "warning",
          duration: 4000,
          isClosable: true,
        });
        setIsRegistered(false);
        setCustomer({
          name: "",
          email: "",
          cpf: "",
          phone: "",
          password: "123",
          age: 18,
          gender: "FEMALE",
          role: "ROLE_CUSTOMER",
        });
      } else {
        toast({
          title: "Erro na busca.",
          description: "Erro ao buscar cliente. Tente novamente.",
          status: "error",
          duration: 4000,
          isClosable: true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterCustomer = async () => {
    try {
      customer.cpf = cpf;
      console.log(customer);
      const response = await saveCustomer(customer);
      console.log(response.data);
      if (response.status === 200) {
        toast({
          title: "Cliente registrado com sucesso!",
          status: "success",
          duration: 4000,
          isClosable: true,
        });
        onCustomerSelected(response.data); // Pass customer to next step
      }
    } catch (error) {
      toast({
        title: "Erro ao registrar cliente.",
        description: "Verifique os campos e tente novamente.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  return (
    <Stack justify={"center"} width={"full"} marginBottom={"10rem"}>
      <Stack spacing={4} width={"full"} marginBottom={8}>
        <Text fontSize={"xl"}>
          {" "}
          Adicione um cliente a essa compra ou cadastre um novo cliente{" "}
        </Text>
        <Input
          value={cpf}
          onChange={(e) => setCpf(cpfMask(e.target.value))}
          placeholder="Digite o CPF"
        />
        <Button
          onClick={handleSearchCustomer}
          isLoading={loading}
          colorScheme="blue"
        >
          Buscar Cliente
        </Button>
      </Stack>
      <Stack spacing={6}>
        <Text fontSize={"xl"}> Dados do cliente </Text>
        <Stack mt={6} spacing={2}>
          <FormLabel>Nome</FormLabel>
          <Input
            value={customer.name}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
          />
          <FormLabel>Email</FormLabel>
          <Input
            value={customer.email}
            onChange={(e) =>
              setCustomer({ ...customer, email: e.target.value })
            }
          />
          <FormLabel>Telefone</FormLabel>
          <Input
            value={customer.phone}
            onChange={(e) =>
              setCustomer({ ...customer, phone: e.target.value })
            }
          />
        </Stack>

        <Stack
          zIndex={100}
          position={"fixed"}
          bottom={0}
          left={0}
          width={"full"}
          backgroundColor={"white"}
          p={2}
          alignItems={"center"}
        >
          <Flex
            width={"full"}
            gap={4}
            maxWidth={{ base: "full", lg: "container.lg" }}
            flexDirection={{ base: "column-reverse", lg: "row" }}
          >
            <Button
              width="full"
              bg="gray.500"
              color="white"
              _hover={{ bg: "gray.400" }}
              onClick={() => setStep(1)}
            >
              Voltar
            </Button>
            {isRegistered ? (
              <Button
                width="full"
                onClick={() => {
                  onCustomerSelected(customer);
                }}
                isLoading={loading}
                bg={"blue.700"}
                color={"white"}
              >
                Continuar
              </Button>
            ) : (
              <>
                <Button
                  width="full"
                  onClick={() => {
                    onCustomerSelected(customer);
                  }}
                  isLoading={loading}
                  bg={"red.700"}
                  _hover={{ bg: "red.600" }}
                  color={"white"}
                >
                  Continuar sem cliente
                </Button>
                {/*<Button width="full" disabled={cpf.length < 11} onClick={handleRegisterCustomer} isLoading={loading} bg={'blue.700'} _hover={{ bg: 'blue.600' }} color={'white'}>
                                            Registrar cliente
                                        </Button>*/}
              </>
            )}
          </Flex>
        </Stack>
      </Stack>
    </Stack>
  );
};

export default CustomerStep;
