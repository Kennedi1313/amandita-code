import {
  Wrap,
  Stack,
  Flex,
  Text,
  Button,
  Heading,
  Box,
  Input,
  Image,
  useToast,
  Spinner,
  RadioGroup,
  Radio,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@chakra-ui/react";

import { useEffect, useState } from "react";
import CardWithImageForSelling from "./components/product/ProductCardForSelling.jsx";
import { useShoppingFavorites } from "./hooks/use-shopping-favorites.jsx";
import { sell } from "./services/product-client.js";
import CustomerStep from "./components/sell/CustomerStep.jsx";
import SidebarWithHeader from "./components/shared/SideBar.jsx";
import { getStoreConfig, getUrl } from "./services/client.js";

const Sell = () => {
  const formatCurrency = (
    amount = 0,
    promo = 0,
    parcelas = 1,
    currency = "BRL",
  ) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
      minimumIntegerDigits: 2,
    }).format(
      (promo > 0 ? amount * (1 - promo / 100) : amount) / 100 / parcelas,
    );
  };

  const {
    favoritesDetails,
    favoritesCount,
    clearFavorites,
    addItemToFavorites,
  } = useShoppingFavorites();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // For managing the multi-step process
  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    cpf: "",
    phone: "",
    password: "123",
    age: 18,
    gender: "FEMALE",
    role: "ROLE_CUSTOMER",
  }); // Hold the customer selected or registered
  const [paymentMethod, setPaymentMethod] = useState("pix"); // Default payment method is 'pix'
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([{}]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [hasPromo, setHasPromo] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    let total = 0;
    let promo = false;
    Object.entries(favoritesDetails).map(([key, product]) => {
      total += product.price * (1 - product.promo / 100) * product.quantity;
      promo = promo || product.promo > 0;
      setTotalPrice(total);
      setHasPromo(promo);
    });
  }, [favoritesCount]);

  const handleSearch = async () => {
    try {
      if (searchTerm === "") return;
      const response = await fetch(
        `${getUrl()}/api/v1/products/by-name?query=${searchTerm}&page=${0}&size=${500}`,
        getStoreConfig(),
      );
      const data = await response.json();
      setSearchResults(data.content);
      onOpen();
    } catch (error) {
      toast({
        title: "Erro na pesquisa.",
        description: "Ocorreu um erro ao buscar os produtos.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const addItemToCart = (product) => {
    addItemToFavorites(product);

    onClose();
  };

  // Function to handle the sale submission to the API
  const handleFinalizeSale = async () => {
    setLoading(true);
    try {
      const saleItemRequests = Object.entries(favoritesDetails).map(
        ([_, product]) => ({
          productId: product.id,
          quantity: product.quantity,
        }),
      );

      const saleRequest = {
        saleItemRequests: saleItemRequests,
        customerEmail: customer.email,
        paymentMethod: paymentMethod,
      };

      console.log(saleRequest);
      const response = await sell(saleRequest);

      if (response.status === 200) {
        toast({
          title: "Venda realizada com sucesso!",
          status: "success",
          duration: 5000,
          isClosable: true,
        });

        clearFavorites();
        setStep(1); // Reset to first step after successful sale
      }
    } catch (error) {
      toast({
        title: "Erro ao finalizar venda.",
        description:
          "Ocorreu um erro ao processar a venda. Tente novamente mais tarde.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const renderSearchItems = () => (
    <Stack spacing={4} width={"full"} marginBottom={10}>
      <Text fontSize={"xl"}> Adicione produtos ao Carrinho </Text>
      <Input
        placeholder="Buscar produtos..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <Button onClick={handleSearch} colorScheme="blue">
        Pesquisar
      </Button>

      {/* Modal para exibir os resultados da pesquisa */}
      <Modal isOpen={isOpen} onClose={onClose} size={"lg"}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Resultados da Pesquisa</ModalHeader>
          <ModalBody>
            {searchResults.length > 0 ? (
              <Stack spacing={4}>
                {Object.entries(searchResults).map(([index, product]) => (
                  <Flex
                    key={index}
                    padding={2}
                    borderBottom={"1px solid lightgray"}
                    justifyContent={"space-between"}
                  >
                    <CardWithImageForSelling
                      {...product}
                      withController={false}
                      onClose={onClose}
                      toast={toast}
                    />
                  </Flex>
                ))}
              </Stack>
            ) : (
              <Text>Nenhum produto encontrado.</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={onClose}>
              Fechar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );

  // Step 1: Cart Items
  const renderCartItems = () => (
    <Stack justify={"center"} width={"full"} marginBottom={"8rem"}>
      <Text fontSize={"xl"}> Produtos no Carrinho </Text>
      {Object.entries(favoritesDetails).map(([index, product]) => (
        <Box key={index} display={"flex"} flexDirection={"column"}>
          <CardWithImageForSelling {...product} withController={true} />
          <Box
            borderTop="2px solid"
            borderColor={"gray.200"}
            w="95%"
            alignSelf={"center"}
          />
        </Box>
      ))}
    </Stack>
  );

  // Step 2: Customer Step (Uses the CustomerStep component)
  const renderCustomerInfo = () => (
    <CustomerStep
      setStep={setStep}
      onCustomerSelected={(selectedCustomer) => {
        setCustomer(selectedCustomer); // Set the selected customer from the CustomerStep
        setStep(3); // Move to next step after customer is selected
      }}
      initialCustomer={customer}
    />
  );

  // Step 3: Payment Method
  const renderPaymentMethod = () => (
    <Stack
      spacing={4}
      width={"full"}
      marginBottom={"8rem"}
      maxWidth={{ base: "full", lg: "container.lg" }}
    >
      <Heading fontSize="lg">Método de Pagamento</Heading>
      <RadioGroup onChange={setPaymentMethod} value={paymentMethod}>
        <Stack direction="row">
          <Radio value="pix">Pix</Radio>
          <Radio value="money">Dinheiro</Radio>
          <Radio value="credit-card">Cartão de Crédito</Radio>
        </Stack>
      </RadioGroup>
    </Stack>
  );

  // Handle empty cart
  if (Object.entries(favoritesDetails).length <= 0 && step === 1) {
    return (
      <SidebarWithHeader>
        {renderSearchItems()}
        <Heading fontSize={"2xl"} textAlign={"center"} mt={10}>
          Nenhum produto adicionado ao carrinho ainda!
        </Heading>
        <Text textAlign={"center"} mt={4}>
          Adicione alguns produtos ao carrinho usando a pesquisa acima.
        </Text>
      </SidebarWithHeader>
    );
  }

  return (
    <SidebarWithHeader>
      {step === 1 && renderSearchItems()}
      {step === 1 && renderCartItems()}
      {step === 2 && renderCustomerInfo()}
      {step === 3 && renderPaymentMethod()}

      {(step === 1 || step === 3) && (
        <Stack
          position={"fixed"}
          bottom={{ base: "100px", md: 5 }}
          left={0}
          width={"full"}
          backgroundColor={"white"}
          height={"8rem"}
        >
          <Flex
            justifyContent={"space-between"}
            padding={"1rem"}
            bgColor={"gray.50"}
            backgroundColor={"white"}
            maxWidth={{ base: "full", lg: "container.lg" }}
            mx="auto"
            width={"full"}
            style={{ margin: "auto" }}
          >
            <Text color={"gray.600"} fontWeight={"bold"}>
              Total:
            </Text>
            <Box display="flex" flexDirection="column">
              <Box>
                {!hasPromo && totalPrice > 5000 ? (
                  <span>
                    <Text fontSize={"xl"} fontWeight={"bold"}>
                      {formatCurrency(totalPrice * 0.95)}
                    </Text>
                    <Text className="text-sm font-thin"> no pix</Text>
                  </span>
                ) : (
                  <Text fontSize={"xl"} fontWeight={"bold"}>
                    {formatCurrency(totalPrice)}
                  </Text>
                )}
              </Box>
              {totalPrice >= 10000 ? (
                <Text className="text-sm font-thin text-gray-700">
                  ou 3x de {formatCurrency(totalPrice, 0, 3)} sem juros
                </Text>
              ) : totalPrice >= 5000 ? (
                <Text className="text-xs font-thin text-gray-700">
                  ou 1x de {formatCurrency(totalPrice)} sem juros
                </Text>
              ) : (
                ""
              )}
            </Box>
          </Flex>
        </Stack>
      )}

      {/* Navigation Buttons */}
      <Stack
        position={"fixed"}
        bottom={0}
        left={0}
        width={"full"}
        backgroundColor={"white"}
        p={2}
        alignItems={"center"}
      >
        {step === 1 && (
          <Flex
            width={"full"}
            gap={4}
            maxWidth={{ base: "full", lg: "container.lg" }}
            flexDirection={{ base: "column-reverse", lg: "row" }}
          >
            <Button
              width={"full"}
              bg={"gray.500"}
              color={"white"}
              _hover={{ bg: "red.500" }}
              onClick={clearFavorites}
              isDisabled={loading} // Disable button while loading
            >
              Limpar Carrinho
            </Button>
            <Button
              width="full"
              bg="blue.700"
              color="white"
              _hover={{ bg: "blue.600" }}
              onClick={() => setStep(2)}
            >
              Próximo
            </Button>
          </Flex>
        )}
        {
          // navigation of step 2 is inside customerStep component
        }
        {step === 3 && (
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
              onClick={() => setStep(step - 1)}
            >
              Voltar
            </Button>
            <Button
              width="full"
              bg="green.700"
              color="white"
              _hover={{ bg: "green.500" }}
              onClick={handleFinalizeSale}
              isLoading={loading}
            >
              Finalizar Venda
            </Button>
          </Flex>
        )}
      </Stack>
    </SidebarWithHeader>
  );
};

export default Sell;
