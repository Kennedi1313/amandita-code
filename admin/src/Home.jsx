import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Grid,
  HStack,
  Icon,
  IconButton,
  Image,
  Input,
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
  useBreakpointValue,
  useDisclosure,
} from "@chakra-ui/react";
import SidebarWithHeader from "./components/shared/SideBar.jsx";
import PageHeader from "./components/shared/PageHeader.jsx";
import {
  getSales,
  reconcileMercadoPagoSales,
  getProducts,
  productsPictureUrl,
  updateSale,
  createMelhorEnvioLabel,
  printMelhorEnvioLabel,
  refreshMelhorEnvioTracking,
} from "./services/product-client.js";
import { getCategories, getCustomerByEmail, getStoreInfo } from "./services/client.js";
import { useAuth } from "./components/context/AuthContext.jsx";
import { errorNotification, successNotification } from "./services/notification.js";
import {
  FiAlertCircle,
  FiChevronRight,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiEye,
  FiImage,
  FiLayers,
  FiMapPin,
  FiMessageCircle,
  FiPackage,
  FiSearch,
  FiShoppingBag,
  FiTag,
  FiTruck,
  FiUser,
  FiX,
  FiFileText,
  FiPrinter,
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
  ENVIADO: {
    label: "Enviado",
    colorScheme: "orange",
    icon: FiTruck,
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

const getSaleAmounts = (sale) => {
  const itemsTotal = getItemsTotalCents(sale);
  const rawTotal = Number(sale?.totalPrice || 0);
  const totalIsInReais = rawTotal > 0 && (itemsTotal === 0 || rawTotal < itemsTotal);
  const totalCents = Number.isFinite(rawTotal)
    ? Math.max(itemsTotal, Math.round(rawTotal * (totalIsInReais ? 100 : 1)))
    : itemsTotal;

  return {
    itemsCents: itemsTotal,
    shippingCents: Math.max(0, totalCents - itemsTotal),
    totalCents,
  };
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

const getOrderAction = (status) => {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "PENDENTE") {
    return {
      title: "Aguardando pagamento",
      description: "O pedido entra em preparo depois da confirmação do pagamento.",
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
      title: "Enviar ou disponibilizar",
      description: "Marque como enviado quando o pedido sair da loja.",
      nextStatus: "ENVIADO",
      buttonLabel: "Marcar como enviado",
      colorScheme: "orange",
    };
  }

  if (normalizedStatus === "ENVIADO") {
    return {
      title: "Confirmar entrega",
      description: "Finalize quando o cliente receber ou retirar o pedido.",
      nextStatus: "ENTREGUE",
      buttonLabel: "Marcar como entregue",
      colorScheme: "purple",
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
    profile: null,
    categoriesCount: 0,
    productsCount: 0,
  });
  const { customer } = useAuth();
  const [selectedSale, setSelectedSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reconcilingPayments, setReconcilingPayments] = useState(false);
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [search, setSearch] = useState("");
  const [salesPage, setSalesPage] = useState(0);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [printingLabel, setPrintingLabel] = useState(false);
  const [refreshingTracking, setRefreshingTracking] = useState(false);
  const [error, setError] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const saleDetailsDrawerSize = useBreakpointValue({ base: "full", md: "xl" });

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
    if (!customer?.username) return;
    try {
      const [storeResponse, categoriesResponse, productsResponse, profileResponse] =
        await Promise.all([
          getStoreInfo(),
          getCategories(),
          getProducts(0),
          getCustomerByEmail(customer?.username),
        ]);

      setSetupData({
        store: storeResponse.data,
        profile: profileResponse.data,
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

  const refreshSales = async () => {
    setLoading(true);
    setReconcilingPayments(true);
    try {
      const response = await reconcileMercadoPagoSales();
      const result = response.data;
      if (result.pendingSales > 0) {
        if (result.failed > 0) {
          errorNotification(
            "Sincronização incompleta",
            `${result.failed} venda(s) não puderam ser consultadas. Tente atualizar novamente. IDs: ${result.failedSaleIds.join(", ")}`,
          );
        } else {
          successNotification(
            "Vendas sincronizadas",
            `${result.pendingSales} pendente(s) consultada(s): ${result.reconciled} atualizada(s), ${result.stillPending} ainda pendente(s) e ${result.notFound} sem pagamento localizado.`,
          );
        }
      }
    } catch (err) {
      errorNotification(
        "Falha na sincronização",
        err.response?.data?.message || "Não foi possível consultar o Mercado Pago. Tente atualizar novamente.",
      );
    } finally {
      setReconcilingPayments(false);
    }
    await Promise.all([fetchSales(), fetchSetupData()]);
  };

  useEffect(() => {
    refreshSales();
  }, [customer?.username]);

  const filteredSales = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...sales]
      .sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))
      .filter((sale) => {
        const status = normalizeStatus(sale.status);
        const matchesStatus =
          statusFilter === "TODOS" ||
          (statusFilter === "CANCELADOS"
            ? ["CANCELADO", "RECUSADO"].includes(status)
            : status === statusFilter);
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

  const salesPageSize = 10;
  const salesPageCount = Math.ceil(filteredSales.length / salesPageSize);
  const visibleSales = filteredSales.slice(
    salesPage * salesPageSize,
    (salesPage + 1) * salesPageSize,
  );

  useEffect(() => {
    setSalesPage((currentPage) =>
      Math.min(currentPage, Math.max(salesPageCount - 1, 0)),
    );
  }, [salesPageCount]);

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
          (total, sale) => total + getSaleAmounts(sale).totalCents,
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
        filter: "CANCELADOS",
        tone: "red",
        icon: FiAlertCircle,
        description: "sem continuidade",
      }),
    ];

    return { dashboardCards };
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

  const generateLabel = async (saleId) => {
    setGeneratingLabel(true);
    try {
      const response = await createMelhorEnvioLabel(saleId);
      setSelectedSale(response.data);
      await fetchSales();
      successNotification("Etiqueta gerada", "A etiqueta do Melhor Envio foi gerada.");
    } catch (err) {
      errorNotification(
        "Não foi possível gerar a etiqueta",
        err.response?.data?.message || "Confira o endereço, a cotação e as dimensões dos produtos.",
      );
    } finally {
      setGeneratingLabel(false);
    }
  };

  const printLabel = async (saleId) => {
    setPrintingLabel(true);
    try {
      const response = await printMelhorEnvioLabel(saleId);
      setSelectedSale(response.data);
      if (response.data?.melhorEnvioLabelUrl) window.open(response.data.melhorEnvioLabelUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      errorNotification("Não foi possível imprimir a etiqueta", err.response?.data?.message || "Tente novamente.");
    } finally {
      setPrintingLabel(false);
    }
  };

  const refreshTracking = async (saleId) => {
    setRefreshingTracking(true);
    try {
      const response = await refreshMelhorEnvioTracking(saleId);
      setSelectedSale(response.data);
      await fetchSales();
      successNotification("Rastreio atualizado", "O status do envio foi atualizado.");
    } catch (err) {
      errorNotification("Não foi possível atualizar o rastreio", err.response?.data?.message || "Tente novamente.");
    } finally {
      setRefreshingTracking(false);
    }
  };

  const selectedItems = getSaleItems(selectedSale);
  const selectedAddress = selectedSale?.customer?.addresses?.[0];
  const selectedAmounts = getSaleAmounts(selectedSale);
  const selectedStatus = normalizeStatus(selectedSale?.status);
  const selectedAction = getOrderAction(selectedStatus);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isStatusDrawerOpen, setIsStatusDrawerOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [isGenerateLabelDrawerOpen, setIsGenerateLabelDrawerOpen] = useState(false);

  const handleRequestStatusChange = (saleId, newStatus) => {
    setPendingStatus(newStatus);
    setIsStatusDrawerOpen(true);
  };

  return (
    <SidebarWithHeader>
      <Box maxW="7xl" mx="auto" px={{ base: 0, md: 6 }} py={{ base: 3, md: 8 }}>
        <PageHeader
          title="Vendas"
          description="Acompanhe pedidos, pagamentos e preparo em um só lugar."
        >
          <Button
            variant="outline"
            onClick={refreshSales}
            isLoading={loading || reconcilingPayments}
            alignSelf={{ base: "stretch", md: "auto" }}
          >
            Atualizar
          </Button>
        </PageHeader>

        {loading ? (
          <Box textAlign="center" mt={16}>
            <Spinner size="xl" color="brand.500" />
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
          <Stack spacing={{ base: 3, md: 5 }}>
            <SetupChecklist
              setupData={setupData}
              salesCount={sales.length}
            />

            <Box
              bg="white"
              border="1px solid"
              borderColor="gray.100"
              borderRadius="md"
              p={{ base: 3, md: 5 }}
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
                    Pedidos por situação
                  </Text>
                  <Text color="gray.500" fontSize="sm">
                    Visão rápida do dinheiro e do trabalho que ainda precisa de
                    ação.
                  </Text>
                </Box>
                <Button
                  variant="outline"
                  colorScheme="brand"
                  leftIcon={<FiCreditCard />}
                  onClick={() => {
                    setStatusFilter("TODOS");
                    setSalesPage(0);
                  }}
                >
                  Todos os pedidos
                </Button>
              </Flex>

              <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
                {summary.dashboardCards.map((card) => (
                  <DashboardStatusCard
                    key={card.title}
                    card={card}
                    onClick={() => {
                      setStatusFilter(card.filter);
                      setSalesPage(0);
                    }}
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
                p={{ base: 3, md: 4 }}
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
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setSalesPage(0);
                    }}
                    placeholder="Buscar por pedido, cliente, email, telefone ou CPF"
                  />
                </Box>
                <Select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setSalesPage(0);
                  }}
                  maxW={{ base: "full", lg: "220px" }}
                >
                  <option value="TODOS">Todos os status</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="APROVADO">Aprovado</option>
                  <option value="PREPARANDO">Preparando</option>
                  <option value="ENTREGUE">Entregue</option>
                  <option value="CANCELADO">Cancelado</option>
                  <option value="CANCELADOS">Cancelados e recusados</option>
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
                <>
                  <SimpleGrid
                    display={{ base: "grid", md: "none" }}
                    columns={{ base: 1, sm: 2 }}
                    spacing={2}
                    p={{ base: 2, sm: 3 }}
                  >
                    {visibleSales.map((sale) => (
                      <Box
                        key={sale.id}
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="lg"
                        p={3}
                        minW={0}
                      >
                        <Grid templateColumns="1fr auto" gap={2} alignItems="start">
                          <Box minW={0}>
                            <Text fontWeight="bold" noOfLines={1}>
                              Pedido #{sale.id}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {formatDate(sale.saleDate)}
                            </Text>
                          </Box>
                          <Tooltip label="Ver detalhes do pedido">
                            <IconButton
                              aria-label={`Ver detalhes do pedido ${sale.id}`}
                              icon={<FiEye />}
                              colorScheme="brand"
                              variant="solid"
                              size="sm"
                              onClick={() => handleViewDetails(sale)}
                            />
                          </Tooltip>
                          <Box minW={0}>
                            <Text fontSize="xs" color="gray.500">Cliente</Text>
                            <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                              {sale.customer?.name || "Sem cliente"}
                            </Text>
                          </Box>
                          <Box textAlign="right">
                            <Text fontSize="xs" color="gray.500">Total</Text>
                            <Text fontSize="sm" fontWeight="bold" whiteSpace="nowrap">
                              {formatCurrencyFromCents(getSaleAmounts(sale).totalCents)}
                            </Text>
                          </Box>
                          <Box gridColumn="1 / -1">
                            <StatusBadge status={sale.status} />
                          </Box>
                        </Grid>
                      </Box>
                    ))}
                  </SimpleGrid>

                  <TableContainer display={{ base: "none", md: "block" }}>
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
                      {visibleSales.map((sale) => {
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
                              {formatCurrencyFromCents(getSaleAmounts(sale).totalCents)}
                            </Td>
                            <Td textAlign="right">
                              <Tooltip label="Ver detalhes do pedido">
                                <IconButton
                                  aria-label="Ver detalhes do pedido"
                                  icon={<FiEye />}
                                  colorScheme="brand"
                                  variant="solid"
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
                </>
              )}
              {filteredSales.length > 0 && (
                <Flex
                  px={4}
                  py={3}
                  borderTop="1px solid"
                  borderColor="gray.100"
                  justify="space-between"
                  flexDirection={{ base: "column", md: "row" }}
                  align="center"
                  gap={3}
                >
                  <Text fontSize="sm" color="gray.600">
                    Exibindo {salesPage * salesPageSize + 1} – 
                    {Math.min((salesPage + 1) * salesPageSize, filteredSales.length)} de {filteredSales.length} vendas
                  </Text>
                  <HStack>
                    <Button
                      size="sm"
                      variant="outline"
                      isDisabled={salesPage === 0}
                      onClick={() => setSalesPage((page) => page - 1)}
                    >
                      Anterior
                    </Button>
                    <Text fontSize="sm" color="gray.600" minW="90px" textAlign="center">
                      Página {salesPage + 1} de {salesPageCount}
                    </Text>
                    <Button
                      size="sm"
                      variant="outline"
                      isDisabled={salesPage >= salesPageCount - 1}
                      onClick={() => setSalesPage((page) => page + 1)}>
                      Próxima
                    </Button>
                  </HStack>
                </Flex>
              )}
            </Box>
          </Stack>
        )}
      </Box>

      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        placement="right"
        size={saleDetailsDrawerSize || "xl"}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader>
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
          </DrawerHeader>
          <DrawerCloseButton />
          <DrawerBody>
            {selectedSale ? (
              <Stack spacing={5}>
                <OrderOperationPanel
                  sale={selectedSale}
                  action={selectedAction}
                  isLoading={updatingStatus}
                  onChangeStatus={handleRequestStatusChange}
                  isGeneratingLabel={generatingLabel}
                  onGenerateLabel={() => setIsGenerateLabelDrawerOpen(true)}
                  isPrintingLabel={printingLabel}
                  onPrintLabel={printLabel}
                  isRefreshingTracking={refreshingTracking}
                  onRefreshTracking={refreshTracking}
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
                      {selectedSale.shippingMethod?.startsWith("melhor_envio:")
                        ? "Melhor Envio"
                        : selectedSale.shippingMethod === "local_delivery"
                          ? "Entrega local"
                          : "Retirada"}
                    </Text>
                    {selectedSale.shippingMethod?.startsWith("melhor_envio:") && selectedSale.shippingQuote && (
                      <Text color="gray.600">
                        {(() => {
                          try {
                            const quote = JSON.parse(selectedSale.shippingQuote);
                            return `${quote.label || "Transportadora"}${quote.description ? ` · ${quote.description}` : ""}`;
                          } catch {
                            return "Cotação do Melhor Envio";
                          }
                        })()}
                      </Text>
                    )}
                    <Text color="gray.600">
                      Frete: {selectedSale.shipment
                        ? selectedAmounts.shippingCents > 0
                          ? formatCurrencyFromCents(selectedAmounts.shippingCents)
                          : "Grátis"
                        : "Grátis na retirada"}
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
                      {formatCurrencyFromCents(selectedAmounts.totalCents)}
                    </Text>
                    <Text color="gray.600">
                      {selectedSale.paymentMethod === "MERCADO_PAGO"
                        ? "Mercado Pago"
                        : selectedSale.paymentMethod || "Método não informado"}
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
                      Os produtos dessa compra foram excluídos do catálogo da loja.
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
          </DrawerBody>
          <DrawerFooter gap={3} flexWrap="wrap">
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer
        isOpen={isStatusDrawerOpen}
        onClose={() => {
          if (updatingStatus) return;

          setIsStatusDrawerOpen(false);
          setPendingStatus(null);
        }}
        placement="right"
        size={saleDetailsDrawerSize || "xl"}
      >
        <DrawerOverlay zIndex={1400} />

        <DrawerContent zIndex={1401}>
          <DrawerCloseButton isDisabled={updatingStatus} />

          <DrawerHeader>
            Confirmar alteração de status
          </DrawerHeader>

          <DrawerBody>
            <Stack spacing={4}>
              <Text color="gray.600">
                Tem certeza de que deseja alterar o status deste pedido?
              </Text>

              <Box
                p={4}
                border="1px solid"
                borderColor="gray.200"
                borderRadius="md"
              >
                <Text fontSize="sm" color="gray.500">
                  Número do pedido
                </Text>

                <Text fontWeight="bold" mb={3}>
                  #{selectedSale?.id}
                </Text>

                <Text fontSize="sm" color="gray.500">
                  Status atual
                </Text>

                <Box mb={3}>
                  <StatusBadge status={selectedSale?.status} />
                </Box>

                <Text fontSize="sm" color="gray.500">
                  Novo status
                </Text>

                <Text fontWeight="semibold">
                  {<StatusBadge status={pendingStatus} /> || "Não selecionado"}
                </Text>
              </Box>

              <Text fontSize="sm" color="gray.500">
                Confirme somente se deseja aplicar essa alteração ao pedido.
              </Text>
            </Stack>
          </DrawerBody>

          <DrawerFooter gap={3} flexDirection={{ base: "column-reverse", sm: "row" }} w="full">
            <Button
              w="full"
              variant="ghost"
              onClick={() => {
                setIsStatusDrawerOpen(false);
                setPendingStatus(null);
              }}
              isDisabled={updatingStatus}
            >
              Manter status em {selectedSale?.status}
            </Button>

            <Button
              colorScheme="brand"
              w="full"
              isLoading={updatingStatus}
              isDisabled={!pendingStatus}
              onClick={async () => {
                if (!pendingStatus || updatingStatus) return;

                try {
                  await changeStatus(selectedSale?.id, pendingStatus);
                  setIsStatusDrawerOpen(false);
                  setPendingStatus(null);
                } catch (error) {
                  console.error(
                    "Erro ao alterar status do pedido:",
                    error
                  );
                }
              }}
            >
              Mudar status para {pendingStatus}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer
        isOpen={isGenerateLabelDrawerOpen}
        onClose={() => {
          if (!generatingLabel) {
            setIsGenerateLabelDrawerOpen(false);
          }
        }}
        placement="right"
        size={saleDetailsDrawerSize || "xl"}
      >
        <DrawerOverlay />

        <DrawerContent>
          <DrawerCloseButton isDisabled={generatingLabel} />

          <DrawerHeader>
            <Flex align="center" gap={3} pr={8}>
              <Flex
                align="center"
                justify="center"
                boxSize="44px"
                borderRadius="lg"
                bg="blue.50"
                color="blue.600"
              >
                <FiPackage size={22} />
              </Flex>

              <Box>
                <Text fontSize="lg">Gerar etiqueta de envio</Text>
                <Text fontSize="sm" color="gray.500" fontWeight="normal">
                  Pedido #{selectedSale?.id}
                </Text>
              </Box>
            </Flex>
          </DrawerHeader>

          <DrawerBody>
            <Stack spacing={5}>
              <Text color="gray.600">
                Você está prestes a gerar a etiqueta de envio deste
                pedido. Antes de continuar, confira as informações
                da entrega.
              </Text>

              <Box
                border="1px solid"
                borderColor="gray.200"
                borderRadius="lg"
                p={4}
              >
                <Text fontWeight="semibold" mb={3}>
                  O que acontece ao continuar?
                </Text>

                <Stack spacing={4}>
                  <HStack align="start" spacing={3}>
                    <Flex
                      boxSize="36px"
                      flexShrink={0}
                      align="center"
                      justify="center"
                      bg="blue.50"
                      color="blue.600"
                      borderRadius="md"
                    >
                      <FiFileText size={18} />
                    </Flex>

                    <Box>
                      <Text fontWeight="medium">
                        Geração da etiqueta
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        O sistema iniciará o processo de geração da
                        etiqueta para este pedido.
                      </Text>
                    </Box>
                  </HStack>

                  <HStack align="start" spacing={3}>
                    <Flex
                      boxSize="36px"
                      flexShrink={0}
                      align="center"
                      justify="center"
                      bg="blue.50"
                      color="blue.600"
                      borderRadius="md"
                    >
                      <FiPrinter size={18} />
                    </Flex>

                    <Box>
                      <Text fontWeight="medium">
                        Próximo passo
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        Após a geração, você poderá imprimir a etiqueta
                        conforme as opções disponíveis no sistema.
                      </Text>
                    </Box>
                  </HStack>
                </Stack>
              </Box>

              <Box
                p={3}
                bg="orange.50"
                borderRadius="md"
                border="1px solid"
                borderColor="orange.100"
              >
                <HStack align="start" spacing={2}>
                  <Box color="orange.600" pt={0.5}>
                    <FiAlertCircle size={18} />
                  </Box>

                  <Box>
                    <Text fontWeight="semibold" color="orange.800">
                      Importante
                    </Text>
                    <Text fontSize="sm" color="orange.800">
                      Gerar a etiqueta não significa que o pedido
                      foi enviado. Confira os dados de entrega antes
                      de continuar.
                    </Text>
                  </Box>
                </HStack>
              </Box>

              <Text fontSize="sm" color="gray.500">
                Deseja continuar com a geração da etiqueta?
              </Text>
            </Stack>
          </DrawerBody>

          <DrawerFooter gap={3} flexDirection={{ base: "column-reverse", sm: "row" }} w="full">
            <Button
              variant="ghost"
              width="full"
              onClick={() => setIsGenerateLabelDrawerOpen(false)}
              isDisabled={generatingLabel}
            >
              Cancelar
            </Button>

            <Button
              colorScheme="blue"
              width="full"
              leftIcon={<FiPackage />}
              isLoading={generatingLabel}
              loadingText="Gerando etiqueta..."
              onClick={async () => {
                try {
                  await generateLabel();
                  setIsGenerateLabelDrawerOpen(false);
                } catch (error) {
                  console.error("Erro ao gerar etiqueta:", error);
                }
              }}
            >
              Confirmar e gerar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

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
  const profile = setupData.profile || {};
  const steps = [
    {
      label: "Seu perfil",
      description: "Nome e contato do responsável",
      done: Boolean(profile.name && profile.email && profile.phone),
      href: "/dashboard/profile",
      icon: FiUser,
    },
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
      description: "WhatsApp cadastrado (Instagram opcional)",
      done: Boolean(store.whatsapp),
      href: "/dashboard/store",
      icon: FiMessageCircle,
    },
    {
      label: "Categorias",
      description: "Menu organizado para o cliente",
      done: setupData.categoriesCount > 0,
      href: "/dashboard/categories",
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
      href: "/dashboard/shipping",
      icon: FiMapPin,
    },
    {
      label: "Recebimentos",
      description: store.plan === "FREE"
        ? "Disponível no plano Completo"
        : "Conta de pagamento conectada",
      done: store.plan === "FREE" || Boolean(store.mercadoPagoConfigured),
      href: "/dashboard/payments",
      icon: FiCreditCard,
    },
    {
      label: "Primeiro pedido",
      description: "Acompanhe tudo por aqui",
      done: salesCount > 0,
      href: "/dashboard",
      icon: FiShoppingBag,
    },
    {
      label: "Assinar plano Completo",
      description: "Libere todos os recursos da loja",
      done: store.plan === "COMPLETE",
      href: "/dashboard/plan",
      icon: FiLayers,
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
            <Badge colorScheme="brand" borderRadius="full" px={3}>
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
            colorScheme="brand"
            borderRadius="full"
            h="8px"
          />
        </Box>
        <Button
          as="a"
          href={steps.find((step) => !step.done)?.href || "/dashboard/store"}
          colorScheme="brand"
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
            _hover={{ textDecoration: "none", borderColor: "brand.200" }}
          >
            <Flex
              w={9}
              h={9}
              align="center"
              justify="center"
              borderRadius="full"
              bg={step.done ? "green.100" : "white"}
              color={step.done ? "green.700" : "brand.700"}
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

const OrderOperationPanel = ({ sale, action, isLoading, onChangeStatus, isGeneratingLabel, onGenerateLabel, isPrintingLabel, onPrintLabel, isRefreshingTracking, onRefreshTracking }) => {
  const usesMelhorEnvio = sale.shippingMethod?.startsWith("melhor_envio:");
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

        <Flex gap={2} direction={{ base: "column", sm: "row" }}>
          {normalizeStatus(sale.status) === "PREPARANDO" && usesMelhorEnvio && !sale.melhorEnvioShipmentId ? (
            <Button
              colorScheme="orange"
              isLoading={isGeneratingLabel}
              onClick={() => onGenerateLabel(sale.id)}
            >
              Gerar etiqueta
            </Button>
          ) : null}
          {normalizeStatus(sale.status) === "PREPARANDO" && sale.melhorEnvioShipmentId ? (
            <Button
              colorScheme="gray"
              isLoading={isPrintingLabel}
              onClick={() => onPrintLabel(sale.id)}
            >
              Imprimir etiqueta
            </Button>
          ) : null}
          {action.nextStatus ? (
            <Button
              colorScheme={action.colorScheme}
              isLoading={isLoading}
              onClick={() => onChangeStatus(sale.id, action.nextStatus)}
            >
              {action.buttonLabel}
            </Button>
          ) : null}
          {normalizeStatus(sale.status) === "ENVIADO" && sale.melhorEnvioShipmentId ? (
            <Button colorScheme="orange" isLoading={isRefreshingTracking} onClick={() => onRefreshTracking(sale.id)}>
              Atualizar rastreio
            </Button>
          ) : null}
        </Flex>
      </Flex>
    </Box>
  );
};

const dashboardTone = {
  green: {
    amount: "green.600",
    border: "green.100",
    soft: "green.50",
  },
  blue: {
    amount: "blue.700",
    border: "blue.100",
    soft: "blue.50",
  },
  orange: {
    amount: "orange.500",
    border: "orange.100",
    soft: "orange.50",
  },
  red: {
    amount: "red.500",
    border: "red.100",
    soft: "red.50",
  },
};

const DashboardStatusCard = ({ card, onClick }) => {
  const tone = dashboardTone[card.tone] || dashboardTone.blue;

  return (
    <Box
      as="button"
      type="button"
      border="1px solid"
      borderTopWidth="3px"
      borderColor={tone.border}
      borderTopColor={tone.amount}
      borderRadius="xl"
      p={4}
      bg="white"
      w="full"
      minH="164px"
      textAlign="left"
      boxShadow="xs"
      transition="border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease"
      onClick={onClick}
      aria-label={`Filtrar ${card.title}: ${pluralize(card.orderCount, "pedido", "pedidos")}`}
      _hover={{
        borderColor: tone.amount,
        boxShadow: "md",
        transform: "translateY(-2px)",
      }}
      _active={{ transform: "translateY(0)" }}
      _focusVisible={{
        outline: "3px solid",
        outlineColor: "brand.300",
        outlineOffset: "2px",
      }}
    >
      <Flex justify="space-between" align="flex-start" gap={3}>
        <Box minW={0}>
          <Text
            color="gray.800"
            fontSize="sm"
            fontWeight="bold"
            noOfLines={1}
          >
            {card.title}
          </Text>
          <Text mt={1} color="gray.500" fontSize="xs">
            {card.description}
          </Text>
        </Box>
        <Flex
          w={9}
          h={9}
          borderRadius="lg"
          bg={tone.soft}
          color={tone.amount}
          align="center"
          justify="center"
          flexShrink={0}
        >
          <Icon as={card.icon} boxSize={4} />
        </Flex>
      </Flex>
      <Text
        mt={5}
        color="gray.900"
        fontSize={{ base: "2xl", xl: "3xl" }}
        fontWeight="bold"
        lineHeight="1.1"
      >
        {formatCurrencyFromCents(card.amount)}
      </Text>
      <Flex
        align="center"
        justify="space-between"
        gap={2}
        mt={4}
        pt={3}
        borderTop="1px solid"
        borderColor="gray.100"
      >
        <Text color="gray.500" fontSize="xs">
          {pluralize(card.orderCount, "pedido", "pedidos")} ·{" "}
          {pluralize(card.customerCount, "cliente", "clientes")}
        </Text>
        <Icon as={FiChevronRight} color={tone.amount} flexShrink={0} />
      </Flex>
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
