import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  List,
  ListIcon,
  ListItem,
  FormControl,
  FormLabel,
  Input,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  useBreakpointValue,
  useDisclosure,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import SidebarWithHeader from "./components/shared/SideBar.jsx";
import PageHeader from "./components/shared/PageHeader.jsx";
import {
  cancelStoreSubscription,
  startStoreSubscription,
  syncStoreSubscription,
  switchStoreToFree,
} from "./services/client.js";
import { errorNotification, successNotification } from "./services/notification.js";
import { FiAlertTriangle, FiCheckCircle, FiCreditCard, FiXCircle } from "react-icons/fi";

const plans = [
  {
    id: "FREE",
    name: "Grátis",
    price: "R$ 0",
    period: "sem prazo para acabar",
    description: "Veja sua loja funcionando e receba pedidos pelo WhatsApp.",
    features: [
      "Produtos cadastrados sem limite",
      "Até 10 produtos publicados por vez",
      "Até 5 imagens por produto",
      "Pedidos pelo WhatsApp",
      "Retirada na loja",
    ],
    highlighted: false,
  },
  {
    id: "COMPLETE",
    name: "Completo",
    price: "R$ 49,90",
    period: "por mês",
    description: "Todos os recursos atuais da KIZI para colocar sua loja em operação.",
    features: [
      "Publique os produtos que quiser",
      "Até 5 imagens por produto",
      "Pagamento online com Mercado Pago conectado",
      "Entrega local e retirada na loja",
      "Gestão de pedidos, produtos e clientes",
    ],
    highlighted: true,
  },
];

const PlanBilling = () => {
  const planDrawerSize = useBreakpointValue({ base: "full", md: "md" });
  const [planInfo, setPlanInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingSubscription, setProcessingSubscription] = useState(false);
  const [payerEmail, setPayerEmail] = useState("");
  const {
    isOpen: isCancelDialogOpen,
    onOpen: onCancelDialogOpen,
    onClose: onCancelDialogClose,
  } = useDisclosure();
  const {
    isOpen: isFreeDialogOpen,
    onOpen: onFreeDialogOpen,
    onClose: onFreeDialogClose,
  } = useDisclosure();
  const {
    isOpen: isPayerDialogOpen,
    onOpen: onPayerDialogOpen,
    onClose: onPayerDialogClose,
  } = useDisclosure();

  const loadPlan = async () => {
    try {
      const response = await syncStoreSubscription();
      setPlanInfo(response.data);
    } catch (err) {
      errorNotification(
        err.code || "Erro",
        err.response?.data?.message || "Não foi possível carregar o plano da loja.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, []);

  const handleStartSubscription = async () => {
    if (planInfo?.subscriptionStatus === "pending" && planInfo?.subscriptionCheckoutUrl) {
      window.location.assign(planInfo.subscriptionCheckoutUrl);
      return;
    }
    onPayerDialogOpen();
  };

  const confirmStartSubscription = async () => {
    setProcessingSubscription(true);
    try {
      const response = await startStoreSubscription(payerEmail.trim());
      const checkoutUrl = response.data.subscriptionCheckoutUrl;
      if (!checkoutUrl) {
        throw new Error("O Mercado Pago não retornou o link para a assinatura.");
      }
      onPayerDialogClose();
      window.location.assign(checkoutUrl);
    } catch (err) {
      errorNotification(
        err.code || "Erro",
        err.response?.data?.message || err.message || "Não foi possível iniciar a assinatura.",
      );
    } finally {
      setProcessingSubscription(false);
    }
  };

  const handleCancelSubscription = async () => {
    setProcessingSubscription(true);
    try {
      const response = await cancelStoreSubscription();
      setPlanInfo(response.data);
      successNotification(
        "Renovação cancelada",
        "Você continua com o Completo até o fim do período pago.",
      );
      onCancelDialogClose();
    } catch (err) {
      errorNotification(
        err.code || "Erro",
        err.response?.data?.message || "Não foi possível cancelar a assinatura.",
      );
    } finally {
      setProcessingSubscription(false);
    }
  };

  const handleSwitchToFree = async () => {
    setProcessingSubscription(true);
    try {
      const response = await switchStoreToFree();
      setPlanInfo(response.data);
      successNotification(
        "Plano Grátis ativado",
        "Todos os produtos foram pausados. Você pode republicar manualmente até 10 quando quiser.",
      );
      onFreeDialogClose();
    } catch (err) {
      errorNotification(
        err.code || "Erro",
        err.response?.data?.message || "Não foi possível mudar para o plano Grátis.",
      );
    } finally {
      setProcessingSubscription(false);
    }
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("pt-BR") : null;
  const subscriptionStatusLabels = {
    authorized: "Assinatura ativa",
    pending: "Aguardando autorização",
    cancelled: "Cancelamento agendado",
    canceled: "Cancelamento agendado",
    paused: "Pausada",
    past_due: "Pagamento pendente",
    rejected: "Não aprovada",
  };
  const subscriptionStatus = planInfo?.subscriptionStatus;
  const isCompletePlan = planInfo?.plan === "COMPLETE";
  const isCancellationScheduled = ["cancelled", "canceled"].includes(subscriptionStatus);
  const canCancelSubscription = ["authorized", "pending", "past_due", "paused"]
    .includes(subscriptionStatus)
    && Boolean(planInfo?.subscriptionCheckoutUrl || planInfo?.paidThrough || isCompletePlan);
  const canSwitchToFreeNow = isCompletePlan && isCancellationScheduled;

  return (
    <SidebarWithHeader>
      <Box maxW="7xl" mx="auto" px={{ base: 0, md: 6 }} py={{ base: 3, md: 8 }}>
        <Stack spacing={{ base: 5, md: 7 }}>
          <PageHeader
            title="Plano e cobrança"
            description="Gerencie o plano e a forma de cobrança da sua loja."
          />

          {loading ? (
            <Flex justify="center" py={12}>
              <Spinner size="lg" color="brand.500" />
            </Flex>
          ) : planInfo && (
            <>
              <Box
                bg="white"
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="xl"
                p={{ base: 4, md: 6 }}
              >
                <Flex direction={{ base: "column", sm: "row" }} justify="space-between" gap={4}>
                  <Box>
                    <Text fontSize="sm" color="gray.500" fontWeight="medium">Plano atual</Text>
                    <HStack mt={1} spacing={3}>
                      <Text fontSize="2xl" fontWeight="bold">
                        {planInfo.plan === "COMPLETE" ? "Completo" : "Grátis"}
                      </Text>
                      <Badge
                        colorScheme={planInfo.plan === "COMPLETE" ? "green" : subscriptionStatus === "pending" ? "yellow" : "gray"}
                        borderRadius="full"
                        px={3}
                        py={1}
                      >
                        {planInfo.plan === "COMPLETE"
                          ? subscriptionStatusLabels[subscriptionStatus] || "Ativo"
                          : "Plano atual"}
                      </Badge>
                    </HStack>
                    <Text mt={2} color="gray.600">
                      {planInfo.publishedProducts} produto(s) publicado(s)
                      {planInfo.publishedProductLimit != null
                        ? ` de ${planInfo.publishedProductLimit}`
                        : ""}
                    </Text>
                  </Box>
                  <Box textAlign={{ base: "left", sm: "right" }}>
                    <Text fontSize="sm" color="gray.500" fontWeight="medium">
                      {subscriptionStatus === "cancelled" || subscriptionStatus === "past_due"
                        ? "Acesso Completo até"
                        : "Próxima cobrança"}
                    </Text>
                    <Text mt={1} fontWeight="semibold">
                      {planInfo.plan === "FREE"
                        ? "Sem cobrança"
                        : formatDate(planInfo.paidThrough)
                          || formatDate(planInfo.nextPaymentAt)
                          || (subscriptionStatus === "pending" ? "Após autorização no Mercado Pago" : "Sem cobrança")}
                    </Text>
                  </Box>
                </Flex>
                {planInfo.plan === "COMPLETE"
                  && isCancellationScheduled
                  && formatDate(planInfo.paidThrough) && (
                    <Text mt={4} color="gray.600">
                      O Completo continua disponível até {formatDate(planInfo.paidThrough)}. Depois disso, sua loja volta ao Grátis automaticamente.
                    </Text>
                  )}
                {planInfo.plan === "COMPLETE" && subscriptionStatus === "past_due" && (
                  <Text mt={4} color="orange.700">
                    Não conseguimos confirmar a última cobrança. Atualize o pagamento no Mercado Pago para manter os recursos do Completo.
                  </Text>
                )}
              </Box>

              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5} alignItems="stretch">
                {plans.map((plan) => {
                  const isCurrentPlan = plan.id === planInfo.plan;
                  return (
                    <Box
                      key={plan.id}
                      bg="white"
                      borderWidth={isCurrentPlan ? "2px" : "1px"}
                      borderColor={isCurrentPlan ? "brand.500" : "gray.200"}
                      borderRadius="xl"
                      p={{ base: 4, md: 6 }}
                      boxShadow={isCurrentPlan ? "md" : "sm"}
                      display="flex"
                      flexDirection="column"
                    >
                      <Flex justify="space-between" align="center" gap={3}>
                        <Text fontSize="xl" fontWeight="bold">{plan.name}</Text>
                        {isCurrentPlan && <Badge colorScheme="green">Plano atual</Badge>}
                        {plan.id === "COMPLETE" && !isCurrentPlan && (
                          <Badge colorScheme="purple">Recomendado</Badge>
                        )}
                      </Flex>

                      <HStack align="baseline" spacing={2} mt={4}>
                        <Text fontSize="3xl" fontWeight="bold" color="brand.800">{plan.price}</Text>
                        <Text color="gray.500">{plan.period}</Text>
                      </HStack>

                      <Text color="gray.600" mt={3} minH={{ lg: "48px" }}>{plan.description}</Text>

                      <List spacing={3} mt={5} flex="1">
                        {plan.features.map((feature) => (
                          <ListItem key={feature} display="flex" alignItems="flex-start">
                            <ListIcon as={FiCheckCircle} color="brand.600" mt={1} />
                            <Text>{feature}</Text>
                          </ListItem>
                        ))}
                      </List>

                      {plan.id === "COMPLETE" && isCompletePlan && isCancellationScheduled && (
                        <Text mt={5} color="orange.700" fontSize="sm">
                          Renovação cancelada. Seu acesso continua
                          {formatDate(planInfo.paidThrough)
                            ? ` até ${formatDate(planInfo.paidThrough)}`
                            : " até o fim do período pago"}.
                        </Text>
                      )}
                      {plan.id === "COMPLETE" && isCompletePlan && subscriptionStatus === "authorized" && (
                        <Text mt={5} color="gray.600" fontSize="sm">
                          Sua assinatura está ativa. Você pode cancelar a renovação quando quiser.
                        </Text>
                      )}
                      {plan.id === "FREE" && isCompletePlan && !canSwitchToFreeNow && (
                        <Text mt={5} color="gray.600" fontSize="sm">
                          Para voltar ao Grátis, cancele a renovação no card Completo.
                        </Text>
                      )}
                      {plan.id === "FREE" && canSwitchToFreeNow && (
                        <Text mt={5} color="gray.600" fontSize="sm">
                          Você pode manter o Completo até o fim do período ou voltar ao Grátis agora.
                        </Text>
                      )}

                      <Button
                        mt={5}
                        isDisabled={processingSubscription
                          || (plan.id === "FREE" && (isCurrentPlan || (isCompletePlan && !canSwitchToFreeNow)))
                          || (plan.id === "COMPLETE" && isCurrentPlan && !canCancelSubscription)}
                        isLoading={processingSubscription}
                        variant={plan.id === "COMPLETE" && isCurrentPlan ? "outline" : "solid"}
                        colorScheme={plan.id === "COMPLETE" && isCurrentPlan && canCancelSubscription
                          ? "red"
                          : "brand"}
                        onClick={() => {
                          if (plan.id === "FREE") {
                            onFreeDialogOpen();
                          } else if (isCurrentPlan) {
                            onCancelDialogOpen();
                          } else {
                            handleStartSubscription();
                          }
                        }}
                        leftIcon={!isCurrentPlan ? <FiCreditCard /> : undefined}
                      >
                        {plan.id === "FREE"
                          ? isCurrentPlan
                            ? "Plano atual"
                            : canSwitchToFreeNow
                              ? "Voltar ao Grátis agora"
                              : "Disponível após cancelar o Completo"
                          : isCurrentPlan
                            ? canCancelSubscription
                              ? "Cancelar renovação"
                              : "Cancelamento agendado"
                            : subscriptionStatus === "pending"
                              ? "Continuar assinatura"
                              : "Assinar Completo"}
                      </Button>
                    </Box>
                    );
                })}
              </SimpleGrid>

              <Text color="gray.500" fontSize="sm" textAlign="center">
                Pagamentos e dados do cartão são processados com segurança pelo Mercado Pago.
              </Text>
            </>
          )}
        </Stack>
      </Box>

      <Drawer isOpen={isPayerDialogOpen} onClose={onPayerDialogClose} placement="right" size={"xl"}>
        <DrawerOverlay />
        <DrawerContent>
          <Box bg="brand.50" px={6} pt={6} pb={5}>
            <HStack spacing={3} align="flex-start">
              <Flex flexShrink={0} align="center" justify="center" w="42px" h="42px" borderRadius="full" bg="brand.100" color="brand.600">
                <Icon as={FiCreditCard} boxSize={5} />
              </Flex>
              <Box pr={6}>
                <Text fontSize="xl" fontWeight="bold" color="gray.800">Ativar o plano Completo</Text>
                <Text mt={1} fontSize="sm" color="gray.600">Mais recursos para sua loja vender sem limitações.</Text>
              </Box>
            </HStack>
          </Box>
          <DrawerCloseButton top={5} right={5} isDisabled={processingSubscription} />
          <DrawerBody px={6} py={6}>
            <Stack spacing={4}>
              <Box bg="brand.50" borderRadius="lg" p={4}>
                <Text fontWeight="bold" color="brand.900">Tudo o que sua loja precisa para vender mais</Text>
                <List spacing={2} mt={3}>
                  <ListItem display="flex" alignItems="flex-start">
                    <ListIcon as={FiCheckCircle} color="brand.600" mt={1} />
                    <Text fontSize="sm">Produtos ilimitados publicados e mais liberdade para montar seu catálogo.</Text>
                  </ListItem>
                  <ListItem display="flex" alignItems="flex-start">
                    <ListIcon as={FiCheckCircle} color="brand.600" mt={1} />
                    <Text fontSize="sm">Pagamento online e entrega local para facilitar cada pedido.</Text>
                  </ListItem>
                </List>
              </Box>
              <Text color="gray.600">
                A assinatura custa R$ 49,90 por mês. Você será redirecionado ao Mercado Pago para escolher a forma de pagamento. A cobrança só começa depois da autorização.
              </Text>
              <FormControl isRequired>
                <FormLabel>E-mail para cobrança</FormLabel>
                <Input
                  type="email"
                  autoComplete="email"
                  value={payerEmail}
                  onChange={(event) => setPayerEmail(event.target.value)}
                  placeholder="voce@exemplo.com"
                  autoFocus
                />
                <Text mt={2} fontSize="sm" color="gray.500">
                  Usaremos este e-mail para identificar a cobrança da sua assinatura no Mercado Pago.
                </Text>
              </FormControl>
            </Stack>
          </DrawerBody>
          <DrawerFooter gap={3} flexWrap="wrap">
            <Button
              colorScheme="brand"
              w={"full"}
              type="button"
              onClick={confirmStartSubscription}
              isLoading={processingSubscription}
              isDisabled={!payerEmail.trim()}
            >
              Continuar para o pagamento
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer isOpen={isFreeDialogOpen} onClose={onFreeDialogClose} placement="right" size={"xl"}>
        <DrawerOverlay bg="blackAlpha.600" />
        <DrawerContent>
          <Box bg="orange.50" px={6} pt={6} pb={5}>
            <HStack spacing={3} align="flex-start">
              <Flex
                flexShrink={0}
                align="center"
                justify="center"
                w="42px"
                h="42px"
                borderRadius="full"
                bg="orange.100"
                color="orange.600"
              >
                <Icon as={FiAlertTriangle} boxSize={5} />
              </Flex>
              <Box pr={6}>
                <Text fontSize="xl" fontWeight="bold" color="gray.800">
                  Voltar para o plano Grátis?
                </Text>
                <Text mt={1} fontSize="sm" color="gray.600">
                  A mudança acontece agora e a renovação do Completo já está cancelada.
                </Text>
              </Box>
            </HStack>
          </Box>
          <DrawerCloseButton top={5} right={5} isDisabled={processingSubscription} />
          <DrawerBody px={6} py={6}>
            <Stack spacing={4}>
              <Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={4}>
                <Text fontSize="sm" fontWeight="bold" color="gray.700" mb={3}>
                  O que muda na sua loja
                </Text>
                <Stack spacing={3}>
                  <HStack align="flex-start" spacing={3}>
                    <Icon as={FiCheckCircle} color="red.400" mt={0.5} />
                    <Text fontSize="sm" color="gray.600">Os recursos do Completo deixam de ficar disponíveis imediatamente.</Text>
                  </HStack>
                  <HStack align="flex-start" spacing={3}>
                    <Icon as={FiCheckCircle} color="red.400" mt={0.5} />
                    <Text fontSize="sm" color="gray.600">A loja poderá ter no máximo 10 produtos publicados.</Text>
                  </HStack>
                  <HStack align="flex-start" spacing={3}>
                    <Icon as={FiCheckCircle} color="green.500" mt={0.5} />
                    <Text fontSize="sm" color="gray.600">Nenhuma nova cobrança será feita pelo Mercado Pago.</Text>
                  </HStack>
                </Stack>
              </Box>
              <Box bg="gray.50" borderRadius="lg" px={4} py={3}>
                <Text fontSize="sm" color="gray.600">
                  Seus produtos e dados continuam salvos, mas todos ficam pausados ao mudar de plano. Depois, você pode republicar manualmente até 10 produtos pela tela de produtos.
                </Text>
              </Box>
            </Stack>
          </DrawerBody>
          <DrawerFooter gap={3} flexDirection={{ base: "column-reverse", sm: "row" }} w="full">
            <Button
              variant="outline"
              w="full"
              onClick={onFreeDialogClose}
              isDisabled={processingSubscription}
            >
              Manter plano Completo
            </Button>
            <Button
              colorScheme="brand"
              w="full"
              onClick={handleSwitchToFree}
              isLoading={processingSubscription}
            >
              Confirmar plano Grátis
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer isOpen={isCancelDialogOpen} onClose={onCancelDialogClose} placement="right" size={"xl"}>
        <DrawerOverlay bg="blackAlpha.600" />
        <DrawerContent>
          <Box bg="red.50" px={6} pt={6} pb={5}>
            <HStack spacing={3} align="flex-start">
              <Flex flexShrink={0} align="center" justify="center" w="42px" h="42px" borderRadius="full" bg="red.100" color="red.500">
                <Icon as={FiXCircle} boxSize={5} />
              </Flex>
              <Box pr={6}>
                <Text fontSize="xl" fontWeight="bold" color="gray.800">Cancelar a renovação?</Text>
                <Text mt={1} fontSize="sm" color="gray.600">Você pode continuar usando o Completo até o fim do período pago.</Text>
              </Box>
            </HStack>
          </Box>
          <DrawerCloseButton top={5} right={5} isDisabled={processingSubscription} />
          <DrawerBody px={6} py={6}>
            <Stack spacing={4}>
              <Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={4}>
                <Text fontSize="sm" fontWeight="bold" color="gray.700" mb={3}>O que acontece depois</Text>
                <Stack spacing={3}>
                  <HStack align="flex-start" spacing={3}><Icon as={FiCheckCircle} color="green.500" mt={0.5} /><Text fontSize="sm" color="gray.600">Nenhuma nova cobrança será feita pelo Mercado Pago.</Text></HStack>
                  <HStack align="flex-start" spacing={3}><Icon as={FiCheckCircle} color="green.500" mt={0.5} /><Text fontSize="sm" color="gray.600">Os recursos do Completo continuam disponíveis até {formatDate(planInfo?.paidThrough) || "o fim do período pago"}.</Text></HStack>
                  <HStack align="flex-start" spacing={3}><Icon as={FiAlertTriangle} color="orange.500" mt={0.5} /><Text fontSize="sm" color="gray.600">Depois, a loja volta ao Grátis e todos os produtos ficam pausados. Você poderá republicar manualmente até 10.</Text></HStack>
                </Stack>
              </Box>
              <Box bg="gray.50" borderRadius="lg" px={4} py={3}>
                <Text fontSize="sm" color="gray.600">Se mudar de ideia antes do fim do período, você poderá assinar o Completo novamente pelo mesmo fluxo.</Text>
              </Box>
            </Stack>
          </DrawerBody>
          <DrawerFooter gap={3} w="full" flexDirection={{ base: "column-reverse", sm: "row" }}>
            <Button variant="outline" w="full" onClick={onCancelDialogClose} isDisabled={processingSubscription}>Manter assinatura</Button>
            <Button colorScheme="red" w="full" onClick={handleCancelSubscription} isLoading={processingSubscription}>Confirmar cancelamento</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </SidebarWithHeader>
  );
};

export default PlanBilling;
