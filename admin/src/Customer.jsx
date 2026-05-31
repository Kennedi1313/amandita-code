import {
  Spinner,
  Text,
  Box,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Alert,
  AlertIcon,
  HStack,
  Icon,
  Stack,
  TableContainer,
} from "@chakra-ui/react";
import SidebarWithHeader from "./components/shared/SideBar.jsx";
import PageHeader from "./components/shared/PageHeader.jsx";
import { useEffect, useState } from "react";
import { getCustomers } from "./services/client.js";
import CreateCustomerDrawer from "./components/customer/CreateCustomerDrawer.jsx";
import { errorNotification } from "./services/notification.js";
import { FiMapPin, FiPhone, FiUser } from "react-icons/fi";

const Customer = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setError] = useState("");

  const fetchCustomers = () => {
    setLoading(true);
    getCustomers()
      .then((res) => {
        setCustomers(res.data);
      })
      .catch((err) => {
        const message =
          err.response?.data?.message || "Falha ao carregar clientes";
        setError(message);
        errorNotification(err.code || "Erro", message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  if (loading) {
    return (
      <SidebarWithHeader>
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="purple.500"
          size="xl"
        />
      </SidebarWithHeader>
    );
  }

  return (
    <SidebarWithHeader>
      <Box maxW="7xl" mx="auto" px={{ base: 2, md: 6 }} py={{ base: 4, md: 8 }}>
        <PageHeader
          title="Clientes"
          description="Consulte contato, CPF e endereço dos compradores da loja."
        >
        </PageHeader>

        {err ? (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {err}
          </Alert>
        ) : customers.length <= 0 ? (
          <Box
            border="1px solid"
            borderColor="gray.100"
            borderRadius="md"
            bg="white"
            p={{ base: 6, md: 10 }}
            textAlign="center"
          >
            <Icon as={FiUser} boxSize={10} color="#5f5482" />
            <Text mt={3} fontWeight="bold" fontSize="xl">
              Nenhum cliente ainda
            </Text>
            <Text mt={1} color="gray.500">
              Quando alguém comprar ou se cadastrar na loja, os dados aparecem
              aqui.
            </Text>
          </Box>
        ) : (
          <TableContainer
            border="1px solid"
            borderColor="gray.100"
            borderRadius="md"
            bg="white"
          >
            <Table variant="simple">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Cliente</Th>
                  <Th>Contato</Th>
                  <Th>Endereço</Th>
                </Tr>
              </Thead>
              <Tbody>
                {customers.map((customer) => {
                  const address = customer?.addresses?.[0];

                  return (
                    <Tr key={customer.id} _hover={{ bg: "gray.50" }}>
                      <Td pl={4}>
                        <Text fontWeight="bold">
                          {customer?.name || "Sem nome"}
                        </Text>
                        <Text color="gray.500" fontSize="sm">
                          {customer?.cpf || "CPF não informado"}
                        </Text>
                      </Td>
                      <Td pl={4}>
                        <Stack spacing={1}>
                          <Text>{customer?.email || "Sem email"}</Text>
                          <HStack color="gray.500" fontSize="sm">
                            <Icon as={FiPhone} />
                            <Text>{customer?.phone || "Sem telefone"}</Text>
                          </HStack>
                        </Stack>
                      </Td>
                      <Td pl={4} maxW="360px">
                        {address ? (
                          <HStack align="flex-start" spacing={2}>
                            <Icon as={FiMapPin} color="gray.400" mt={1} />
                            <Text noOfLines={2}>
                              {address.street}, {address.number} -{" "}
                              {address.district}, {address.city}/RN,{" "}
                              {address.zip}
                            </Text>
                          </HStack>
                        ) : (
                          <Text color="gray.500">Sem endereço</Text>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </SidebarWithHeader>
  );
};

export default Customer;
