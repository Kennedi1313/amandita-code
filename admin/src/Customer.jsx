import {
  Wrap,
  WrapItem,
  Spinner,
  Text,
  Box,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from "@chakra-ui/react";
import SidebarWithHeader from "./components/shared/SideBar.jsx";
import { useEffect, useState } from "react";
import { getCustomers } from "./services/client.js";
import CardWithImage from "./components/customer/CustomerCard.jsx";
import CreateCustomerDrawer from "./components/customer/CreateCustomerDrawer.jsx";
import { errorNotification } from "./services/notification.js";
import { useAuth } from "./components/context/AuthContext.jsx";

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
        setError(err.response.data.message);
        errorNotification(err.code, err.response.data.message);
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
          color="blue.500"
          size="xl"
        />
      </SidebarWithHeader>
    );
  }

  if (err) {
    return (
      <SidebarWithHeader>
        <CreateCustomerDrawer fetchCustomers={fetchCustomers} />
        <Text mt={5}>Ooops there was an error</Text>
      </SidebarWithHeader>
    );
  }

  if (customers.length <= 0) {
    return (
      <SidebarWithHeader>
        <CreateCustomerDrawer fetchCustomers={fetchCustomers} />
        <Text mt={5}>No customers available</Text>
      </SidebarWithHeader>
    );
  }

  return (
    <SidebarWithHeader>
      {/*<CreateCustomerDrawer
                fetchCustomers={fetchCustomers}
            />*/}
      <Box
        width={"full"}
        maxWidth={{ base: "full", lg: "container.lg" }}
        mx="auto"
      >
        <Box paddingTop={"24px"} paddingBottom={"8px"}>
          <Text fontWeight={"semibold"} fontSize={"4xl"}>
            Clientes
          </Text>
        </Box>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Cliente</Th>
              <Th>Endereco</Th>
            </Tr>
          </Thead>
          <Tbody>
            {customers.map((customer, index) => (
              <Tr key={index}>
                <Td pl={4}>
                  <Text>{customer?.name || "Sem Cliente"}</Text>
                  <Text>{customer?.cpf}</Text>
                  <Text>{customer?.email}</Text>
                  <Text>{customer?.phone}</Text>
                </Td>
                <Td pl={4}>
                  {customer && customer.addresses[0] ? (
                    <Text>
                      {customer?.addresses[0].street},{" "}
                      {customer?.addresses[0].number} -{" "}
                      {customer?.addresses[0].district},{" "}
                      {customer?.addresses[0].city}/RN,{" "}
                      {customer?.addresses[0].zip}
                    </Text>
                  ) : (
                    "Sem Endereço"
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </SidebarWithHeader>
  );
};

export default Customer;
