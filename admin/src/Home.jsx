import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Grid,
  HStack,
  Icon,
  IconButton,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useDisclosure,
} from "@chakra-ui/react";
import SidebarWithHeader from "./components/shared/SideBar.jsx";
import PageHeader from "./components/shared/PageHeader.jsx";
import {
  getSales,
  getProducts,
  productsPictureUrl,
  updateSale,
} from "./services/product-client.js";
import { getCategories, getStoreInfo } from "./services/client.js";
import {
  FiAlertCircle,
  FiChevronRight,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiEye,
  FiImage,
  FiInfo,
  FiMapPin,
  FiMessageCircle,
  FiPackage,
  FiSearch,
  FiShoppingBag,
  FiTag,
  FiTruck,
  FiUser,
  FiX,
} from "react-icons/fi";

const statusConfig = {
  PENDENTE: {
    label: "Pendente",
    colorScheme: "yellow",
    icon: FiClock,
  },
  APROVADO: {
    label: "Pago",
    colorScheme: "green",
    icon: FiCheckCircle,
  },
  PREPARANDO: {
    label: "Em separação",
    colorScheme: "blue",
    icon: FiPackage,
  },
  ENTREGUE: {
    label: "Entregue",
    colorScheme: "purple",
    icon: FiTruck,
  },
  CANCELADO: {
    label: "Cancelado",
    colorScheme: "red",
    icon: FiAlertCircle,
  },
  RECUSADO: {
    label: "Recusado",
    colorScheme: "red",
    icon: FiAlertCircle,
  },
};

const formatCurrencyFromCents = (amount = 0, currency = "BRL") =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount || 0) / 100);

const parsePriceToCents = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (value === null || value === undefined) {
    return null;
  }

  const digits = String(value).replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  const cents = Number(digits);
  return Number.isFinite(cents) ? cents : null;
};

const getSaleItems = (sale) => sale?.items || sale?.saleItems || [];

const getCustomerIdentity = (sale) =>
  sale?.customer?.email ||
  sale?.customer?.cpf ||
  sale?.customer?.phone ||
  sale?.customer?.name ||
  `pedido-${sale?.id}`;

const countUniqueCustomers = (sales) =>
  new Set(sales.map(getCustomerIdentity).filter(Boolean)).size;

const pluralize = (count, singular, plural) =>
  `${count} ${count === 1 ? singular : plural}`;

const getItemsTotalCents = (sale) =>
  getSaleItems(sale).reduce((total, item) => {
    const price = parsePriceToCents(item.price) || 0;
    const quantity = Number(item.quantity || 0);
    return total + price * quantity;
  }, 0);

const getSaleTotalCents = (sale) => {
  const itemsTotal = getItemsTotalCents(sale);
  const rawTotal = Number(sale?.totalPrice || 0);

  if (itemsTotal > 0) {
    if (Math.abs(rawTotal - itemsTotal) < 0.01) {
      return itemsTotal;
    }

    if (Math.abs(rawTotal * 100 - itemsTotal) < 1) {
      return itemsTotal;
    }
  }

  if (!Number.isFinite(rawTotal)) {
    return itemsTotal;
  }

  return rawTotal % 1 !== 0 ? Math.round(rawTotal * 100) : rawTotal;
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Data inválida";
};

const normalizeStatus = (status) => String(status || "PENDENTE").toUpperCase();

const getStatusConfig = (status) =>
  statusConfig[normalizeStatus(status)] || {
    label: status || "Pendente",
    colorScheme: "gray",
    icon: FiClock,
  };

const storeWorkflowSteps = [
  {
    id: "SEPARAR",
    title: "Separar pedido",
    description: "Conferir itens e deixar pronto",
    icon: FiPackage,
    activeStatuses: ["APROVADO"],
    doneStatuses: ["PREPARANDO", "ENTREGUE"],
  },
  {
    id: "ENTREGAR",
    title: "Entregar ou retirar",
    description: "Concluir quando sair ou for retirado",
    icon: FiTruck,
    activeStatuses: ["PREPARANDO"],
    doneStatuses: ["ENTREGUE"],
  },
];

const getOrderAction = (status) => {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "PENDENTE") {
    return {
      title: "Aguardando pagamento",
      description: "Sem ação por enquanto.",
      nextStatus: null,
      buttonLabel: null,
      colorScheme: "yellow",
    };
  }

  if (normalizedStatus === "APROVADO") {
    return {
      title: "Separar pedido",
      description: "Confira os itens e deixe tudo pronto.",
      nextStatus: "PREPARANDO",
      buttonLabel: "Marcar em separação",
      colorScheme: "blue",
    };
  }

  if (normalizedStatus === "PREPARANDO") {
    return {
      title: "Entregar ou retirar",
      description: "Finalize quando o pedido sair ou for retirado.",
      nextStatus: "ENTREGUE",
      buttonLabel: "Marcar como entregue",
      colorScheme: "green",
    };
  }

  if (normalizedStatus === "ENTREGUE") {
    return {
      title: "Pedido concluído",
      description: "Nada pendente.",
      nextStatus: null,
      buttonLabel: null,
      colorScheme: "purple",
    };
  }

  return {
    title: "Pedido sem continuidade",
    description: "Esse pedido foi cancelado ou recusado.",
    nextStatus: null,
    buttonLabel: null,
    colorScheme: "red",
  };
};

const StatusBadge = ({ status }) => {
  const config = getStatusConfig(status);
  return (
    <Badge
      colorScheme={config.colorScheme}
      borderRadius="full"
      px={3}
      py={1}
      textTransform="none"
      fontSize="xs"
    >
      <HStack spacing={1.5}>
        <Icon as={config.icon} />
        <Text>{config.label}</Text>
      </HStack>
    </Badge>
  );
};

const SalesDashboard = () => {
  const [sales, setSales] = useState([]);
  const [setupData, setSetupData] = useState({
    store: null,
    categoriesCount: 0,
    productsCount: 0,
  });
  const [selectedSale, setSelectedSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [search, setSearch] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const fetchSales = async () => {
    try {
      const response = await getSales();
      setSales(response.data?.content || response.data || []);
      setError(null);
    } catch (err) {
      console.log(err);
      setError("Não foi possível carregar as vendas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSetupData = async () => {
    try {
      const [storeResponse, categoriesResponse, productsResponse] =
        await Promise.all([getStoreInfo(), getCategories(), getProducts(0)]);

      setSetupData({
        store: storeResponse.data,
        categoriesCount: categoriesResponse.data?.length || 0,
        productsCount:
          productsResponse.data?.totalElements ||
          productsResponse.data?.content?.length ||
          0,
      });
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchSales();
    fetchSetupData();
  }, []);

  const filteredSales = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...sales]
      .sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))
      .filter((sale) => {
        const status = normalizeStatus(sale.status);
        const matchesStatus = statusFilter === "TODOS" || status === statusFilter;
        const searchable = [
          sale.id,
          sale.status,
          sale.customer?.name,
          sale.customer?.email,
          sale.customer?.phone,
          sale.customer?.cpf,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return matchesStatus && searchable.includes(normalizedSearch);
      });
  }, [sales, search, statusFilter]);

  const summary = useMemo(() => {
    const salesByStatuses = (statuses) =>
      sales.filter((sale) => statuses.includes(normalizeStatus(sale.status)));

    const createCard = ({
      title,
      statuses,
      filter,
      tone,
      icon,
      description,
    }) => {
      const statusSales = salesByStatuses(statuses);
      return {
        title,
        filter,
        tone,
        icon,
        description,
        sales: statusSales,
        amount: statusSales.reduce(
          (total, sale) => total + getSaleTotalCents(sale),
          0,
        ),
        customerCount: countUniqueCustomers(statusSales),
        orderCount: statusSales.length,
      };
    };

    const dashboardCards = [
      createCard({
        title: "Recebidas",
        statuses: ["ENTREGUE"],
        filter: "ENTREGUE",
        tone: "green",
        icon: FiTruck,
        description: "pedidos concluídos",
      }),
      createCard({
        title: "Confirmadas",
        statuses: ["APROVADO", "PREPARANDO"],
        filter: "APROVADO",
        tone: "blue",
        icon: FiCheckCircle,
        description: "pagas ou em preparo",
      }),
      createCard({
        title: "Aguardando pagamento",
        statuses: ["PENDENTE"],
        filter: "PENDENTE",
        tone: "orange",
        icon: FiClock,
        description: "checkout criado",
      }),
      createCard({
        title: "Canceladas",
        statuses: ["CANCELADO", "RECUSADO"],
        filter: "CANCELADO",
        tone: "red",
        icon: FiAlertCircle,
        description: "sem continuidade",
      }),
    ];

    const maxAmount = Math.max(...dashboardCards.map((card) => card.amount), 0);

    return {
      dashboardCards: dashboardCards.map((card) => ({
        ...card,
        progress: maxAmount
          ? Math.max(card.amount > 0 ? 12 : 0, (card.amount / maxAmount) * 100)
          : 0,
      })),
    };
  }, [sales]);

  function handleViewDetails(sale) {
    setSelectedSale(sale);
    onOpen();
  }

  const changeStatus = async (saleId, status) => {
    setUpdatingStatus(true);
    try {
      const response = await updateSale({ saleId, status });
      setSelectedSale(response.data);
      await fetchSales();
      setError(null);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data ||
        "Não foi possível atualizar o pedido. Tente novamente.";
      setError(message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const selectedItems = getSaleItems(selectedSale);
  const selectedAddress = selectedSale?.customer?.addresses?.[0];
  const selectedStatus = normalizeStatus(selectedSale?.status);
  const selectedAction = getOrderAction(selectedStatus);

  return (
    <SidebarWithHeader>
      <Box maxW="7xl" mx="auto" px={{ base: 2, md: 6 }} py={{ base: 4, md: 8 }}>
        <PageHeader
          title="Vendas"
          description="Acompanhe pedidos, pagamento, cliente e preparo em um so lugar."
        >
          <Button
            variant="outline"
            onClick={() => {
              fetchSales();
              fetchSetupData();
            }}
            isLoading={loading}
            alignSelf={{ base: "stretch", md: "auto" }}
          >
            Atualizar
          </Button>
        </PageHeader>

        {loading ? (
          <Box textAlign="center" mt={16}>
            <Spinner size="xl" color="purple.500" />
          </Box>
        ) : error ? (
          <Box
            bg="red.50"
            border="1px solid"
            borderColor="red.100"
            borderRadius="md"
            p={4}
            color="red.700"
          >
            {error}
          </Box>
        ) : (
          <Stack spacing={5}>
            <SetupChecklist
              setupData={setupData}
              salesCount={sales.length}
            />

            <Box
              bg="white"
              border="1px solid"
              borderColor="gray.100"
              borderRadius="md"
              p={{ base: 4, md: 5 }}
              overflow="hidden"
            >
              <Flex
                direction={{ base: "column", lg: "row" }}
                gap={3}
                justify="space-between"
                align={{ base: "flex-start", lg: "center" }}
                mb={5}
              >
                <Box>
                  <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="bold">
                    Situação dos pedidos
                  </Text>
                  <Text color="gray.500" fontSize="sm">
                    Visão rápida do dinheiro e do trabalho que ainda precisa de
                    ação.
                  </Text>
                </Box>
                <Button
                  variant="outline"
                  colorScheme="purple"
                  leftIcon={<FiCreditCard />}
                  onClick={() => setStatusFilter("TODOS")}
                >
                  Todos os pedidos
                </Button>
              </Flex>

              <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
                {summary.dashboardCards.map((card) => (
                  <DashboardStatusCard
                    key={card.title}
                    card={card}
                    onClick={() => setStatusFilter(card.filter)}
                  />
                ))}
              </SimpleGrid>
            </Box>

            <Box
              bg="white"
              border="1px solid"
              borderColor="gray.100"
              borderRadius="md"
              overflow="hidden"
            >
              <Flex
                p={4}
                gap={3}
                direction={{ base: "column", lg: "row" }}
                justify="space-between"
              >
                <Box position="relative" flex="1">
                  <Icon
                    as={FiSearch}
                    color="gray.400"
                    position="absolute"
                    left={3}
                    top="50%"
                    transform="translateY(-50%)"
                  />
                  <Input
                    pl={10}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por pedido, cliente, email, telefone ou CPF"
                  />
                </Box>
                <Select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  maxW={{ base: "full", lg: "220px" }}
                >
                  <option value="TODOS">Todos os status</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="APROVADO">Aprovado</option>
                  <option value="PREPARANDO">Preparando</option>
                  <option value="ENTREGUE">Entregue</option>
                  <option value="CANCELADO">Cancelado</option>
                  <option value="RECUSADO">Recusado</option>
                </Select>
              </Flex>

              {filteredSales.length === 0 ? (
                <Box p={10} textAlign="center">
                  <Icon as={FiShoppingBag} boxSize={10} color="gray.300" />
                  <Text mt={3} fontWeight="semibold">
                    Nenhuma venda encontrada
                  </Text>
                  <Text color="gray.500">
                    Ajuste a busca ou o filtro para ver outros pedidos.
                  </Text>
                </Box>
              ) : (
                <TableContainer>
                  <Table variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>Pedido</Th>
                        <Th>Cliente</Th>
                        <Th>Status</Th>
                        <Th>Entrega</Th>
                        <Th isNumeric>Valor</Th>
                        <Th textAlign="right">Detalhes</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredSales.map((sale) => {
                        const items = getSaleItems(sale);
                        const itemCount = items.reduce(
                          (total, item) => total + Number(item.quantity || 0),
                          0,
                        );

                        return (
                          <Tr key={sale.id} _hover={{ bg: "gray.50" }}>
                            <Td>
                              <Text fontWeight="bold">#{sale.id}</Text>
                              <Text fontSize="sm" color="gray.500">
                                {formatDate(sale.saleDate)}
                              </Text>
                            </Td>
                            <Td maxW="260px">
                              <Text fontWeight="semibold" noOfLines={1}>
                                {sale.customer?.name || "Sem cliente"}
                              </Text>
                              <Text fontSize="sm" color="gray.500" noOfLines={1}>
                                {sale.customer?.email || "Sem email"}
                              </Text>
                            </Td>
                            <Td>
                              <StatusBadge status={sale.status} />
                            </Td>
                            <Td>
                              <HStack spacing={2} color="gray.700">
                                <Icon as={sale.shipment ? FiTruck : FiPackage} />
                                <Text>{sale.shipment ? "Entrega" : "Retirada"}</Text>
                              </HStack>
                              <Text fontSize="sm" color="gray.500">
                                {itemCount} {itemCount === 1 ? "item" : "itens"}
                              </Text>
                            </Td>
                            <Td isNumeric fontWeight="bold">
                              {formatCurrencyFromCents(getSaleTotalCents(sale))}
                            </Td>
                            <Td textAlign="right">
                              <Tooltip label="Ver detalhes do pedido">
                                <IconButton
                                  aria-label="Ver detalhes do pedido"
                                  icon={<FiEye />}
                                  colorScheme="purple"
                                  variant="ghost"
                                  onClick={() => handleViewDetails(sale)}
                                />
                              </Tooltip>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Stack>
        )}
      </Box>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="4xl"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Flex
              direction={{ base: "column", md: "row" }}
              gap={3}
              justify="space-between"
              align={{ base: "flex-start", md: "center" }}
              pr={8}
            >
              <Box>
                <Text fontSize="xl">Pedido #{selectedSale?.id}</Text>
                <Text fontSize="sm" color="gray.500" fontWeight="normal">
                  {formatDate(selectedSale?.saleDate)}
                </Text>
              </Box>
              <StatusBadge status={selectedSale?.status} />
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedSale ? (
              <Stack spacing={5}>
                <OrderOperationPanel
                  sale={selectedSale}
                  action={selectedAction}
                  isLoading={updatingStatus}
                  onChangeStatus={changeStatus}
                />

                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <InfoPanel title="Cliente" icon={FiUser}>
                    <Text fontWeight="semibold">
                      {selectedSale.customer?.name || "Sem cliente"}
                    </Text>
                    <Text color="gray.600">
                      {selectedSale.customer?.email || "Sem email"}
                    </Text>
                    <Text color="gray.600">
                      {selectedSale.customer?.phone || "Sem telefone"}
                    </Text>
                    <Text color="gray.600">
                      {selectedSale.customer?.cpf || "Sem CPF"}
                    </Text>
                  </InfoPanel>

                  <InfoPanel title="Entrega" icon={FiTruck}>
                    <Text fontWeight="semibold">
                      {selectedSale.shipment ? "Entrega" : "Retirada"}
                    </Text>
                    {selectedAddress ? (
                      <Text color="gray.600">
                        {selectedAddress.street}, {selectedAddress.number} -{" "}
                        {selectedAddress.district}, {selectedAddress.city}/RN,{" "}
                        {selectedAddress.zip}
                      </Text>
                    ) : (
                      <Text color="gray.600">Sem endereço cadastrado</Text>
                    )}
                  </InfoPanel>

                  <InfoPanel title="Pagamento" icon={FiCheckCircle}>
                    <Text fontWeight="semibold">
                      {formatCurrencyFromCents(getSaleTotalCents(selectedSale))}
                    </Text>
                    <Text color="gray.600">
                      {selectedSale.paymentMethod || "Método não informado"}
                    </Text>
                    <Text color="gray.600">
                      {selectedSale.paymentId || selectedSale.preferenceId || ""}
                    </Text>
                  </InfoPanel>
                </SimpleGrid>

                <Box
                  border="1px solid"
                  borderColor="gray.100"
                  borderRadius="md"
                  overflow="hidden"
                >
                  <Flex justify="space-between" align="center" p={4} bg="gray.50">
                    <Text fontWeight="bold">Itens do pedido</Text>
                    <Text color="gray.500" fontSize="sm">
                      {selectedItems.length}{" "}
                      {selectedItems.length === 1 ? "produto" : "produtos"}
                    </Text>
                  </Flex>
                  <Divider />

                  {selectedItems.length === 0 ? (
                    <Box p={6} color="gray.600">
                      Os produtos dessa compra foram excluídos do catálogo da
                      loja.
                    </Box>
                  ) : (
                    <Stack spacing={0} divider={<Divider />}>
                      {selectedItems.map((item, index) => {
                        const paidPrice = parsePriceToCents(item.price);
                        const originalPrice = parsePriceToCents(
                          item.product?.price,
                        );
                        const showOriginalPrice =
                          paidPrice !== null &&
                          originalPrice !== null &&
                          originalPrice > paidPrice;

                        return (
                          <Flex
                            key={index}
                            gap={4}
                            p={4}
                            align={{ base: "flex-start", md: "center" }}
                            direction={{ base: "column", sm: "row" }}
                          >
                            <Image
                              w="88px"
                              h="88px"
                              borderRadius="md"
                              objectFit="cover"
                              src={productsPictureUrl(item.product.id)}
                              alt={item.product.name}
                              fallback={
                                <Box
                                  w="88px"
                                  h="88px"
                                  borderRadius="md"
                                  bg="gray.100"
                                />
                              }
                            />
                            <Grid
                              flex="1"
                              gap={2}
                              templateColumns={{
                                base: "1fr",
                                md: "minmax(0, 1fr) auto",
                              }}
                              w="full"
                            >
                              <Box minW={0}>
                                <Text fontWeight="bold" noOfLines={2}>
                                  {item.product.name}
                                </Text>
                                {item.variation && (
                                  <Text color="gray.500" fontSize="sm">
                                    Opção: {item.variation}
                                  </Text>
                                )}
                                <HStack mt={1} color="gray.500" fontSize="sm">
                                  <Text>Quantidade: {item.quantity}</Text>
                                  <FiX />
                                  {showOriginalPrice && (
                                    <Text
                                      color="red.500"
                                      textDecoration="line-through"
                                    >
                                      {formatCurrencyFromCents(originalPrice)}
                                    </Text>
                                  )}
                                  <Text color="gray.900" fontWeight="semibold">
                                    {formatCurrencyFromCents(paidPrice || 0)}
                                  </Text>
                                </HStack>
                              </Box>
                              <Box textAlign={{ base: "left", md: "right" }}>
                                <Text color="gray.500" fontSize="sm">
                                  Subtotal
                                </Text>
                                <Text fontWeight="bold">
                                  {formatCurrencyFromCents(
                                    (paidPrice || 0) * Number(item.quantity || 0),
                                  )}
                                </Text>
                              </Box>
                            </Grid>
                          </Flex>
                        );
                      })}
                    </Stack>
                  )}
                </Box>
              </Stack>
            ) : (
              <Text>Nenhum detalhe disponível.</Text>
            )}
          </ModalBody>
          <ModalFooter gap={3} flexWrap="wrap">
            {selectedAction.nextStatus && selectedSale && (
              <Button
                colorScheme={selectedAction.colorScheme}
                isLoading={updatingStatus}
                onClick={() =>
                  changeStatus(selectedSale.id, selectedAction.nextStatus)
                }
              >
                {selectedAction.buttonLabel}
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </SidebarWithHeader>
  );
};

const defaultImageValues = new Set([
  "",
  null,
  undefined,
  "logos/local",
  "banners/local",
]);

const SetupChecklist = ({ setupData, salesCount }) => {
  const store = setupData.store || {};
  const steps = [
    {
      label: "Visual da loja",
      description: "Logo e banner definidos",
      done:
        !defaultImageValues.has(store.logoUrl) &&
        !defaultImageValues.has(store.bannerUrl),
      href: "/dashboard/store",
      icon: FiImage,
    },
    {
      label: "Contato para venda",
      description: "WhatsApp ou Instagram cadastrado",
      done: Boolean(store.whatsapp || store.instagram),
      href: "/dashboard/store",
      icon: FiMessageCircle,
    },
    {
      label: "Categorias",
      description: "Menu organizado para o cliente",
      done: setupData.categoriesCount > 0,
      href: "/dashboard/store",
      icon: FiTag,
    },
    {
      label: "Produtos",
      description: "Primeiros itens publicados",
      done: setupData.productsCount > 0,
      href: "/dashboard/products",
      icon: FiPackage,
    },
    {
      label: "Entrega ou retirada",
      description: "Uma forma de receber o pedido",
      done: Boolean(store.pickupEnabled || store.localDeliveryEnabled),
      href: "/dashboard/store",
      icon: FiMapPin,
    },
    {
      label: "Primeiro pedido",
      description: "Acompanhe tudo por aqui",
      done: salesCount > 0,
      href: "/dashboard",
      icon: FiShoppingBag,
    },
  ];

  const completedSteps = steps.filter((step) => step.done).length;
  const progress = Math.round((completedSteps / steps.length) * 100);

  if (completedSteps === steps.length) {
    return null;
  }

  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor="gray.100"
      borderRadius="md"
      p={{ base: 4, md: 5 }}
    >
      <Flex
        direction={{ base: "column", lg: "row" }}
        gap={4}
        justify="space-between"
        align={{ base: "stretch", lg: "center" }}
      >
        <Box flex="1">
          <HStack spacing={2} mb={1}>
            <Badge colorScheme="purple" borderRadius="full" px={3}>
              {completedSteps}/{steps.length}
            </Badge>
            <Text fontWeight="bold" fontSize={{ base: "lg", md: "xl" }}>
              Deixe sua loja pronta para vender
            </Text>
          </HStack>
          <Text color="gray.500" fontSize="sm">
            Um caminho curto para publicar a loja sem deixar o lojista perdido.
          </Text>
          <Progress
            mt={4}
            value={progress}
            colorScheme="purple"
            borderRadius="full"
            h="8px"
          />
        </Box>
        <Button
          as="a"
          href={steps.find((step) => !step.done)?.href || "/dashboard/store"}
          colorScheme="purple"
          alignSelf={{ base: "stretch", lg: "center" }}
        >
          Continuar configurando
        </Button>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={3} mt={5}>
        {steps.map((step) => (
          <Flex
            key={step.label}
            as="a"
            href={step.href}
            gap={3}
            align="center"
            border="1px solid"
            borderColor={step.done ? "green.100" : "gray.100"}
            borderRadius="md"
            p={3}
            bg={step.done ? "green.50" : "gray.50"}
            _hover={{ textDecoration: "none", borderColor: "purple.200" }}
          >
            <Flex
              w={9}
              h={9}
              align="center"
              justify="center"
              borderRadius="full"
              bg={step.done ? "green.100" : "white"}
              color={step.done ? "green.700" : "purple.700"}
              flexShrink={0}
            >
              <Icon as={step.done ? FiCheckCircle : step.icon} />
            </Flex>
            <Box minW={0}>
              <Text fontWeight="bold" noOfLines={1}>
                {step.label}
              </Text>
              <Text color="gray.500" fontSize="sm" noOfLines={1}>
                {step.description}
              </Text>
            </Box>
          </Flex>
        ))}
      </SimpleGrid>
    </Box>
  );
};

const OrderOperationPanel = ({ sale, action, isLoading, onChangeStatus }) => {
  const currentStatus = normalizeStatus(sale?.status);
  const isCancelled = ["CANCELADO", "RECUSADO"].includes(currentStatus);
  const isWaitingPayment = currentStatus === "PENDENTE";
  const paymentDone = !isWaitingPayment && !isCancelled;

  return (
    <Box
      border="1px solid"
      borderColor="gray.100"
      borderRadius="md"
      bg="gray.50"
      p={{ base: 4, md: 5 }}
    >
      <Flex
        direction={{ base: "column", lg: "row" }}
        gap={3}
        justify="space-between"
        align={{ base: "stretch", lg: "center" }}
      >
        <HStack spacing={3} align="center">
          <Flex
            w={11}
            h={11}
            borderRadius="full"
            align="center"
            justify="center"
            bg={`${action.colorScheme}.100`}
            color={`${action.colorScheme}.700`}
            flexShrink={0}
          >
            <Icon as={getStatusConfig(sale.status).icon} boxSize={5} />
          </Flex>
          <Box>
            <Text color="gray.500" fontSize="xs" fontWeight="bold">
              Próxima tarefa
            </Text>
            <Text fontWeight="bold" fontSize="xl" lineHeight="short">
              {action.title}
            </Text>
            <Text color="gray.600" fontSize="sm">
              {action.description}
            </Text>
          </Box>
        </HStack>

        {action.nextStatus ? (
          <Button
            colorScheme={action.colorScheme}
            isLoading={isLoading}
            onClick={() => onChangeStatus(sale.id, action.nextStatus)}
            alignSelf={{ base: "stretch", lg: "center" }}
          >
            {action.buttonLabel}
          </Button>
        ) : (
          <StatusBadge status={sale.status} />
        )}
      </Flex>

      {!isCancelled && (
        <Box mt={5}>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
            <Box
              border="1px solid"
              borderColor={paymentDone ? "green.100" : "yellow.100"}
              borderRadius="md"
              bg={paymentDone ? "green.50" : "yellow.50"}
              p={3}
            >
              <HStack spacing={2}>
                <Flex
                  w={8}
                  h={8}
                  borderRadius="full"
                  align="center"
                  justify="center"
                  bg={paymentDone ? "green.100" : "yellow.100"}
                  color={paymentDone ? "green.700" : "yellow.700"}
                >
                  <Icon as={paymentDone ? FiCheckCircle : FiClock} />
                </Flex>
                <Box minW={0}>
                  <Text fontWeight="bold" noOfLines={1}>
                    Pagamento
                  </Text>
                  <Text color="gray.500" fontSize="sm" noOfLines={1}>
                    {paymentDone ? "Confirmado" : "Aguardando"}
                  </Text>
                </Box>
              </HStack>
            </Box>

            {storeWorkflowSteps.map((step, index) => {
              const isDone = step.doneStatuses.includes(currentStatus);
              const isCurrent = step.activeStatuses.includes(currentStatus);
              const isLocked = isWaitingPayment || (!isDone && !isCurrent);
              const stateLabel = isDone
                ? "Feito"
                : isCurrent
                  ? "Agora"
                  : "Depois";

              return (
                <Box
                  key={step.id}
                  border="1px solid"
                  borderColor={isCurrent ? "purple.200" : "gray.100"}
                  borderRadius="md"
                  bg={isDone ? "green.50" : isCurrent ? "white" : "gray.50"}
                  p={4}
                  opacity={isLocked ? 0.72 : 1}
                >
                  <HStack spacing={3}>
                    <Flex
                      w={8}
                      h={8}
                      borderRadius="full"
                      align="center"
                      justify="center"
                      bg={
                        isDone
                          ? "green.100"
                          : isCurrent
                            ? "purple.100"
                            : "white"
                      }
                      color={
                        isDone
                          ? "green.700"
                          : isCurrent
                            ? "purple.700"
                            : "gray.400"
                      }
                    >
                      <Icon as={isDone ? FiCheckCircle : step.icon} />
                    </Flex>
                    <Box minW={0}>
                      <HStack spacing={2}>
                        <Text fontWeight="bold" noOfLines={1}>
                          {step.title}
                        </Text>
                        <Badge
                          colorScheme={
                            isDone ? "green" : isCurrent ? "purple" : "gray"
                          }
                          borderRadius="full"
                          textTransform="none"
                        >
                          {stateLabel}
                        </Badge>
                      </HStack>
                      <Text color="gray.500" fontSize="sm" noOfLines={1}>
                        {index === 0 ? "Tarefa 1" : "Tarefa 2"}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
              );
            })}
          </SimpleGrid>
        </Box>
      )}
    </Box>
  );
};

const dashboardTone = {
  green: {
    amount: "green.600",
    border: "green.100",
    soft: "green.50",
    muted: "green.100",
    bar: "#2f855a",
    stripe: "rgba(47, 133, 90, 0.2)",
  },
  blue: {
    amount: "blue.700",
    border: "blue.100",
    soft: "blue.50",
    muted: "blue.100",
    bar: "#1d4ed8",
    stripe: "rgba(29, 78, 216, 0.2)",
  },
  orange: {
    amount: "orange.500",
    border: "orange.100",
    soft: "orange.50",
    muted: "orange.100",
    bar: "#dd6b20",
    stripe: "rgba(221, 107, 32, 0.24)",
  },
  red: {
    amount: "red.500",
    border: "red.100",
    soft: "red.50",
    muted: "red.100",
    bar: "#e53e3e",
    stripe: "rgba(229, 62, 62, 0.22)",
  },
};

const DashboardStatusCard = ({ card, onClick }) => {
  const tone = dashboardTone[card.tone] || dashboardTone.blue;

  return (
    <Box
      as="button"
      type="button"
      textAlign="left"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="lg"
      p={4}
      bg="white"
      minH="230px"
      transition="all 0.18s ease"
      onClick={onClick}
      _hover={{
        borderColor: tone.border,
        boxShadow: "md",
        transform: "translateY(-2px)",
      }}
    >
      <Flex justify="space-between" gap={3} align="flex-start">
        <Box>
          <Text fontWeight="bold" fontSize="lg" lineHeight="short">
            {card.title}
          </Text>
          <Text color="gray.500" fontSize="sm">
            {card.description}
          </Text>
        </Box>
        <Tooltip label="Clique para filtrar a lista abaixo">
          <Flex
            w={8}
            h={8}
            borderRadius="full"
            bg={tone.soft}
            color={tone.amount}
            align="center"
            justify="center"
            flexShrink={0}
          >
            <Icon as={FiInfo} />
          </Flex>
        </Tooltip>
      </Flex>

      <Text
        mt={7}
        fontWeight="extrabold"
        color={tone.amount}
        fontSize={{ base: "3xl", xl: "4xl" }}
        lineHeight="1"
      >
        {formatCurrencyFromCents(card.amount)}
      </Text>
      <Text mt={3} color="gray.500" fontWeight="medium">
        {formatCurrencyFromCents(card.amount)} bruto
      </Text>

      <Box
        mt={6}
        h="10px"
        borderRadius="full"
        overflow="hidden"
        bg={tone.muted}
        backgroundImage={`repeating-linear-gradient(120deg, transparent 0, transparent 12px, ${tone.stripe} 12px, ${tone.stripe} 24px)`}
      >
        <Box
          h="full"
          w={`${card.progress}%`}
          borderRadius="full"
          bg={tone.bar}
          transition="width 0.2s ease"
        />
      </Box>

      <Stack mt={6} spacing={2} color={card.orderCount ? tone.amount : "gray.400"}>
        <Flex align="center" justify="space-between" gap={3}>
          <HStack spacing={2}>
            <Icon as={FiUser} />
            <Text fontWeight="bold">
              {pluralize(card.customerCount, "cliente", "clientes")}
            </Text>
          </HStack>
          <Icon as={FiChevronRight} />
        </Flex>
        <Flex align="center" justify="space-between" gap={3}>
          <HStack spacing={2}>
            <Icon as={card.icon} />
            <Text fontWeight="bold">
              {pluralize(card.orderCount, "pedido", "pedidos")}
            </Text>
          </HStack>
          <Icon as={FiChevronRight} />
        </Flex>
      </Stack>
    </Box>
  );
};

const InfoPanel = ({ title, icon, children }) => (
  <Box border="1px solid" borderColor="gray.100" borderRadius="md" p={4}>
    <HStack color="gray.500" mb={3}>
      <Icon as={icon} />
      <Text fontSize="sm" fontWeight="bold" textTransform="uppercase">
        {title}
      </Text>
    </HStack>
    <Stack spacing={1} fontSize="sm">
      {children}
    </Stack>
  </Box>
);

export default SalesDashboard;
