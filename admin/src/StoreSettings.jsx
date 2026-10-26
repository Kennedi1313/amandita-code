import { useEffect, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Icon,
  IconButton,
  Image,
  Input,
  SimpleGrid,
  Spinner,
  Stack,
  Switch,
  Text,
} from "@chakra-ui/react";
import SidebarWithHeader from "./components/shared/SideBar.jsx";
import PageHeader from "./components/shared/PageHeader.jsx";
import {
  getStorefrontUrl,
  getStoreInfo,
  updateStoreInfo,
  uploadStoreImage,
  getMercadoPagoConnectUrl,
  getMelhorEnvioAuthorizeUrl,
  findAddressByCep,
} from "./services/client.js";
import {
  errorNotification,
  successNotification,
} from "./services/notification.js";
import {
  FiCopy,
  FiCheckCircle,
  FiExternalLink,
  FiGlobe,
  FiImage,
  FiAlertCircle,
  FiSave,
  FiUpload,
  FiPlus,
  FiTrash2,
  FiTruck,
} from "react-icons/fi";
import { SiMercadopago } from "react-icons/si";

const centsToDecimal = (value) => (Number(value || 0) / 100).toFixed(2);
const decimalToCents = (value) => {
  const parsed = Number(String(value || "0").replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
};
const maskCep = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};
const getContrastingColor = (hexColor) => {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hexColor || "")) return "#1F1D1B";
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hexColor.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.179 ? "#000000" : "#FFFFFF";
};
const emptyPickupAddress = () => ({
  zip: "",
  street: "",
  number: "",
  district: "",
  city: "",
  state: "",
  reference: "",
});
const normalizePickupAddress = (address) => ({
  ...emptyPickupAddress(),
  ...(address || {}),
  zip: address?.zip || "",
  street: address?.street || "",
  number: address?.number || "",
  district: address?.district || "",
  city: address?.city || "",
  state: address?.state || "",
  reference: address?.reference || "",
});

const MoneyInput = ({ value, onChange, ...inputProps }) => {
  const [draft, setDraft] = useState(centsToDecimal(value));

  useEffect(() => {
    setDraft(centsToDecimal(value));
  }, [value]);

  const commitDraft = () => {
    const cents = decimalToCents(draft);
    setDraft(centsToDecimal(cents));
    if (cents !== value) onChange(cents);
  };

  return (
    <Input
      {...inputProps}
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={(event) => setDraft(event.target.value.replace(/[^\d,.]/g, ""))}
      onFocus={(event) => event.target.select()}
      onBlur={commitDraft}
    />
  );
};

const StoreSettings = ({ section = "store" }) => {
  const [store, setStore] = useState({
    name: "",
    taxDocument: "",
    domain: "",
    logoUrl: "",
    headerBackgroundColor: "#FFFFFF",
    bannerUrl: "",
    bannerMobileUrl: "",
    iconUrl: "",
    instagram: "",
    whatsapp: "",
    pickupEnabled: false,
    pickupAddress: emptyPickupAddress(),
    melhorEnvioOriginAddress: emptyPickupAddress(),
    localDeliveryEnabled: false,
    localDeliveryFee: 0,
    deliveryDistanceRanges: [],
    freeShippingMinAmount: 0,
    shippingOriginZip: "",
    localDeliveryEta: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState("");
  const [plan, setPlan] = useState("FREE");
  const [mercadoPagoConfigured, setMercadoPagoConfigured] = useState(false);
  const [mercadoPagoConnecting, setMercadoPagoConnecting] = useState(false);
  const [melhorEnvioConfigured, setMelhorEnvioConfigured] = useState(false);
  const [melhorEnvioOpen, setMelhorEnvioOpen] = useState(false);
  const [melhorEnvioConnecting, setMelhorEnvioConnecting] = useState(false);
  const [pickupCepLoading, setPickupCepLoading] = useState(false);
  const [originCepLoading, setOriginCepLoading] = useState(false);
  const [originAddressPreview, setOriginAddressPreview] = useState("");

  useEffect(() => {
    const connectionResult = new URLSearchParams(window.location.search).get("mercadopago");
    if (connectionResult === "connected") {
      successNotification("Mercado Pago conectado", "A loja já pode receber pagamentos pelo Checkout Pro.");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (connectionResult === "error") {
      errorNotification("Conexão não concluída", "Não foi possível conectar a conta Mercado Pago. Tente novamente.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    const melhorEnvioResult = new URLSearchParams(window.location.search).get("melhorenvio");
    if (melhorEnvioResult === "connected") {
      successNotification("Melhor Envio conectado", "A loja já pode calcular opções de frete no checkout.");
      setMelhorEnvioOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (melhorEnvioResult === "error") {
      errorNotification("Conexão não concluída", "Não foi possível conectar o Melhor Envio. Tente novamente.");
      setMelhorEnvioOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    getStoreInfo()
      .then((res) => {
        setPlan(res.data.plan || "FREE");
        setStore({
          name: res.data.name || "",
          taxDocument: res.data.taxDocument || "",
          domain: res.data.domain || "",
          logoUrl: res.data.logoUrl || "",
          headerBackgroundColor: res.data.headerBackgroundColor || "#FFFFFF",
          bannerUrl: res.data.bannerUrl || "",
          bannerMobileUrl: res.data.bannerMobileUrl || "",
          iconUrl: res.data.iconUrl || "",
          instagram: res.data.instagram || "",
          whatsapp: res.data.whatsapp || "",
          pickupEnabled: res.data.pickupEnabled === true,
          pickupAddress: normalizePickupAddress(res.data.pickupAddress),
          melhorEnvioOriginAddress: normalizePickupAddress(res.data.melhorEnvioOriginAddress),
          localDeliveryEnabled: res.data.localDeliveryEnabled === true,
          localDeliveryFee: res.data.localDeliveryFee || 0,
          deliveryDistanceRanges: (res.data.deliveryDistanceRanges || []).map((range) => ({ ...range })),
          freeShippingMinAmount: res.data.freeShippingMinAmount || 0,
          shippingOriginZip: res.data.shippingOriginZip || "",
          localDeliveryEta: res.data.localDeliveryEta || "",
        });
        setMercadoPagoConfigured(res.data.mercadoPagoConfigured === true);
        setMelhorEnvioConfigured(res.data.melhorEnvioConfigured === true);
        setMelhorEnvioOpen(res.data.melhorEnvioConfigured === true);
      })
      .catch((err) => {
        errorNotification(
          err.code || "Erro",
          err.response?.data?.message || "Falha ao carregar dados da loja",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const handleMercadoPagoConnect = async () => {
    setMercadoPagoConnecting(true);
    try {
      const response = await getMercadoPagoConnectUrl();
      if (!response.data?.authorizationUrl) throw new Error("URL de autorização ausente");
      window.location.assign(response.data.authorizationUrl);
    } catch (err) {
      const message = typeof err.response?.data === "string"
        ? err.response.data
        : err.response?.data?.message || "Não foi possível iniciar a conexão Mercado Pago.";
      errorNotification("Falha ao conectar", message);
      setMercadoPagoConnecting(false);
    }
  };

  const handleMelhorEnvioConnect = async () => {
    setMelhorEnvioConnecting(true);
    try {
      const response = await getMelhorEnvioAuthorizeUrl();
      window.location.assign(response.data);
    } catch (err) {
      const responseData = err.response?.data;
      const responseMessage = typeof responseData === "string"
        ? responseData
        : responseData?.message;
      errorNotification(
        "Falha ao conectar",
        responseMessage || "Não foi possível iniciar a conexão do Melhor Envio.",
      );
      setMelhorEnvioConnecting(false);
    }
  };

  const updateField = (field, value) => {
    setStore((current) => ({ ...current, [field]: value }));
  };

  const lookupPickupAddress = async (value) => {
    const zip = String(value || "").replace(/\D/g, "");
    if (zip.length !== 8) return;
    setPickupCepLoading(true);
    try {
      const response = await findAddressByCep(zip);
      if (response.data?.erro) throw new Error("CEP não encontrado.");
      setStore((current) => {
        if (current.pickupAddress.zip.replace(/\D/g, "") !== zip) return current;
        return {
          ...current,
          pickupAddress: {
            ...current.pickupAddress,
            street: response.data.logradouro || current.pickupAddress.street,
            district: response.data.bairro || current.pickupAddress.district,
            city: response.data.localidade || current.pickupAddress.city,
            state: response.data.uf || current.pickupAddress.state,
          },
        };
      });
    } catch (error) {
      errorNotification("CEP não encontrado", error.message || "Não foi possível consultar este CEP.");
    } finally {
      setPickupCepLoading(false);
    }
  };

  const lookupDeliveryOrigin = async (value) => {
    const zip = String(value || "").replace(/\D/g, "");
    if (zip.length !== 8) return;
    setOriginCepLoading(true);
    try {
      const response = await findAddressByCep(zip);
      if (response.data?.erro) throw new Error("CEP não encontrado.");
      setStore((current) => current.shippingOriginZip.replace(/\D/g, "") === zip
        ? { ...current, shippingOriginZip: maskCep(current.shippingOriginZip) }
        : current);
      setOriginAddressPreview([
        response.data.logradouro,
        response.data.bairro,
        [response.data.localidade, response.data.uf].filter(Boolean).join(" - "),
      ].filter(Boolean).join(", "));
    } catch (error) {
      setOriginAddressPreview("");
      errorNotification("CEP não encontrado", error.message || "Não foi possível consultar este CEP.");
    } finally {
      setOriginCepLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await updateStoreInfo(store);
      setPlan(response.data.plan || plan);
      setStore({
        name: response.data.name || "",
        taxDocument: response.data.taxDocument || "",
        domain: response.data.domain || "",
        logoUrl: response.data.logoUrl || "",
        headerBackgroundColor: response.data.headerBackgroundColor || store.headerBackgroundColor,
        bannerUrl: response.data.bannerUrl || "",
        bannerMobileUrl: response.data.bannerMobileUrl || "",
        iconUrl: response.data.iconUrl || "",
        instagram: response.data.instagram || "",
        whatsapp: response.data.whatsapp || "",
        pickupEnabled: response.data.pickupEnabled === true,
        pickupAddress: normalizePickupAddress(response.data.pickupAddress || store.pickupAddress),
        melhorEnvioOriginAddress: normalizePickupAddress(response.data.melhorEnvioOriginAddress || store.melhorEnvioOriginAddress),
        localDeliveryEnabled: response.data.localDeliveryEnabled === true,
        localDeliveryFee: response.data.localDeliveryFee || 0,
        deliveryDistanceRanges: (response.data.deliveryDistanceRanges || []).map((range) => ({ ...range })),
        freeShippingMinAmount: response.data.freeShippingMinAmount || 0,
        shippingOriginZip: response.data.shippingOriginZip || "",
        localDeliveryEta: response.data.localDeliveryEta || "",
      });
      successNotification("Loja atualizada", "Dados salvos com sucesso.");
    } catch (err) {
      errorNotification(
        err.code || "Erro",
        err.response?.data?.message || "Falha ao salvar dados da loja",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStoreImageUpload = async (type, file) => {
    if (!file) return;

    setUploadingImage(type);
    try {
      const response = await uploadStoreImage(type, file);
      setPlan(response.data.plan || plan);
      setStore({
        name: response.data.name || "",
        domain: response.data.domain || "",
        logoUrl: response.data.logoUrl || "",
        headerBackgroundColor: response.data.headerBackgroundColor || store.headerBackgroundColor,
        bannerUrl: response.data.bannerUrl || "",
        bannerMobileUrl: response.data.bannerMobileUrl || "",
        iconUrl: response.data.iconUrl || "",
        instagram: response.data.instagram || "",
        whatsapp: response.data.whatsapp || "",
        pickupEnabled: response.data.pickupEnabled === true,
        pickupAddress: normalizePickupAddress(response.data.pickupAddress || store.pickupAddress),
        melhorEnvioOriginAddress: normalizePickupAddress(response.data.melhorEnvioOriginAddress || store.melhorEnvioOriginAddress),
        localDeliveryEnabled: response.data.localDeliveryEnabled === true,
        localDeliveryFee: response.data.localDeliveryFee || 0,
        deliveryDistanceRanges: (response.data.deliveryDistanceRanges || []).map((range) => ({ ...range })),
        freeShippingMinAmount: response.data.freeShippingMinAmount || 0,
        shippingOriginZip: response.data.shippingOriginZip || "",
        localDeliveryEta: response.data.localDeliveryEta || "",
      });
      successNotification("Imagem atualizada", "A vitrine já usa a nova imagem.");
    } catch (err) {
      errorNotification(
        err.code || "Erro",
        err.response?.data?.message || "Falha ao enviar imagem",
      );
    } finally {
      setUploadingImage("");
    }
  };

  const handleRemoveImage = async (field, label) => {
    setSaving(true);
    try {
      const response = await updateStoreInfo({ ...store, [field]: "" });
      setStore((current) => ({ ...current, [field]: response.data[field] || "" }));
      successNotification(`${label} removido`, `${label} removido com sucesso.`);
    } catch (err) {
      errorNotification(
        err.code || "Erro",
        err.response?.data?.message || `Falha ao remover ${label.toLowerCase()}`,
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SidebarWithHeader>
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="#1f633c"
          size="xl"
        />
      </SidebarWithHeader>
    );
  }

  const pickupAddressConfigured = Boolean(
    store.pickupAddress.zip.replace(/\D/g, "").length === 8 &&
    store.pickupAddress.street.trim() && store.pickupAddress.number.trim() &&
    store.pickupAddress.district.trim() && store.pickupAddress.city.trim() &&
    /^[A-Za-z]{2}$/.test(store.pickupAddress.state.trim()),
  );
  const localDeliveryConfigured = Boolean(
    plan === "COMPLETE" && store.localDeliveryEnabled && store.shippingOriginZip.replace(/\D/g, "").length === 8 &&
    store.deliveryDistanceRanges.length > 0,
  );
  const shippingConfigured = (store.pickupEnabled && pickupAddressConfigured) || localDeliveryConfigured;
  const paymentConfigured = mercadoPagoConfigured;
  const isCompletePlan = plan === "COMPLETE";
  const onlineCheckoutEnabled = isCompletePlan && paymentConfigured && shippingConfigured;
  const pageConfigured = section === "payments"
    ? isCompletePlan && paymentConfigured
    : shippingConfigured;
  const pageStatusLabel = section === "payments"
    ? (!isCompletePlan ? "Disponível no plano Completo" : paymentConfigured ? "Recebimentos configurados" : "Recebimentos pendentes")
    : (!isCompletePlan
      ? (shippingConfigured ? "Retirada configurada" : "Retirada pendente")
      : shippingConfigured ? "Frete configurado" : "Frete pendente");

  return (
    <SidebarWithHeader>
      <Box maxW="7xl" mx="auto" px={{ base: 0, md: 6 }} py={{ base: 3, md: 8 }}>
        <Stack spacing={6}>
          <PageHeader
            title={section === "payments" ? "Recebimentos" : section === "shipping" ? "Frete" : "Personalização"}
            description={section === "payments"
              ? "Configure como cada loja recebe os pagamentos."
              : section === "shipping"
                ? "Configure as formas de entrega exibidas no checkout."
                : "Contato e identidade visual usados na vitrine."}
          >
            {section !== "store" && (
              <Box
                px={4}
                py={2}
                borderRadius="full"
                bg={pageConfigured ? "green.50" : "orange.50"}
                color={pageConfigured ? "green.700" : "orange.700"}
                fontWeight="semibold"
                fontSize="sm"
                alignSelf={{ base: "flex-start", md: "center" }}
              >
                <HStack spacing={2}>
                  <Icon as={pageConfigured ? FiCheckCircle : FiAlertCircle} />
                  <Text>{pageStatusLabel}</Text>
                </HStack>
              </Box>
            )}
          </PageHeader>

          {section !== "store" && (
            <Box
              border="1px solid"
              borderColor={onlineCheckoutEnabled ? "green.200" : "orange.200"}
              bg={onlineCheckoutEnabled ? "green.50" : "orange.50"}
              borderRadius="lg"
              px={5}
              py={4}
            >
              <Text fontWeight="bold" color="gray.800">
                {!isCompletePlan
                  ? "No Grátis, pedidos são combinados pelo WhatsApp"
                  : onlineCheckoutEnabled
                    ? "A loja pode receber pedidos online"
                    : "Ainda falta uma etapa para ativar o checkout"}
              </Text>
              <Text color="gray.600" fontSize="sm" mt={1}>
                {!isCompletePlan
                  ? (section === "payments"
                    ? "Mercado Pago fica disponível no plano Completo."
                    : "O plano Grátis permite retirada. Entrega local fica disponível no plano Completo.")
                  : section === "payments"
                  ? (paymentConfigured
                    ? "Os recebimentos desta loja já estão conectados. Confira o menu Frete para liberar o checkout completo."
                    : "Cadastre os recebimentos desta loja para que os pagamentos possam ser direcionados ao lojista.")
                  : (shippingConfigured
                    ? "As formas de entrega estão disponíveis. Confira o menu Recebimentos para liberar o checkout completo."
                    : "Ative pelo menos uma forma de entrega para permitir pedidos com checkout online.")}
              </Text>
              {!isCompletePlan ? (
                <HStack spacing={4} mt={3} flexWrap="wrap">
                  <Text fontSize="sm" color="green.700">✓ Pedidos pelo WhatsApp</Text>
                  <Text fontSize="sm" color={shippingConfigured ? "green.700" : "gray.600"}>
                    {shippingConfigured ? "✓ Retirada configurada" : "○ Configure a retirada"}
                  </Text>
                  <Button as="a" href="/dashboard/plan" size="sm" variant="link" colorScheme="brand">
                    Ver plano Completo
                  </Button>
                </HStack>
              ) : (
                <HStack spacing={4} mt={3} flexWrap="wrap">
                  <Text fontSize="sm" color={paymentConfigured ? "green.700" : "gray.600"}>
                    {paymentConfigured ? "✓ Recebimentos configurados" : "○ Recebimentos pendentes"}
                  </Text>
                  <Text fontSize="sm" color={shippingConfigured ? "green.700" : "gray.600"}>
                    {shippingConfigured ? "✓ Frete configurado" : "○ Frete pendente"}
                  </Text>
                </HStack>
              )}
            </Box>
          )}

          {section === "store" && store.domain && (
            <Box
              border="1px solid"
              borderColor="brand.100"
              borderRadius="md"
              bg="brand.50"
              p={4}
            >
              <HStack
                spacing={3}
                align="flex-start"
                flexWrap="wrap"
              >
                <Icon as={FiGlobe} color="#1f633c" mt={1} />
                <Box flex="1" minW={0}>
                  <Text fontWeight="bold">Endereço público da loja</Text>
                  <Text color="gray.600" wordBreak="break-all">
                    {getStorefrontUrl(store.domain)}
                  </Text>
                </Box>
                <HStack flexShrink={0} ml={{ base: "auto", sm: 0 }}>
                  <IconButton
                    aria-label="Copiar endereço da loja"
                    icon={<FiCopy />}
                    variant="ghost"
                    colorScheme="brand"
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        getStorefrontUrl(store.domain),
                      );
                      successNotification(
                        "Link copiado",
                        "Endereço da loja copiado.",
                      );
                    }}
                  />
                  <IconButton
                    as="a"
                    href={getStorefrontUrl(store.domain)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Abrir loja"
                    icon={<FiExternalLink />}
                    colorScheme="brand"
                  />
                </HStack>
              </HStack>
            </Box>
          )}

          <Box
            as={section === "payments" ? "div" : "form"}
            onSubmit={section === "payments" ? undefined : handleSubmit}
          >
            <Stack spacing={5}>
              {section === "store" && (
                <FormControl>
                  <FormLabel>Cor da barra superior da loja</FormLabel>
                  <Box
                    border="1px solid #e2e8f0"
                    borderRadius="md"
                    overflow="hidden"
                    width="100%"
                    padding={3}
                    backgroundColor={"white"}>
                    <HStack 
                      align="center" spacing={4}
                      width="100%"
                      overflow="hidden">
                      <Input
                        aria-label="Escolher cor da barra superior"
                        type="color"
                        value={store.headerBackgroundColor}
                        onChange={(event) => updateField("headerBackgroundColor", event.target.value.toUpperCase())}
                        width="64px"
                        height="44px"
                        padding="4px"
                        cursor="pointer"
                      />
                      <Input
                        aria-label="Código hexadecimal da cor da barra superior"
                        value={store.headerBackgroundColor}
                        onChange={(event) => updateField("headerBackgroundColor", event.target.value)}
                        onBlur={() => {
                          if (!/^#[0-9A-Fa-f]{6}$/.test(store.headerBackgroundColor)) {
                            updateField("headerBackgroundColor", "#FFFFFF");
                          }
                        }}
                        maxLength={7}
                        width="120px"
                        textTransform="uppercase"
                      />
                      <Box
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="md"
                        px={4}
                        py={2}
                        width={"100%"}
                        bg={/^#[0-9A-Fa-f]{6}$/.test(store.headerBackgroundColor) ? store.headerBackgroundColor : "#FFFFFF"}
                        color={getContrastingColor(store.headerBackgroundColor)}
                        fontWeight="semibold"
                      >
                        Prévia da barra
                      </Box>
                    </HStack>
                    <HStack mt={2} minH="8" justify="space-between" align="center" spacing={2} padding={3}>
                      <Text fontSize="sm" color="gray.600" mt={2}>
                        A logo não será alterada. Ícones e controles da barra ajustam o contraste automaticamente.
                      </Text>
                    </HStack>
                  </Box>
                </FormControl>
              )}

              {section === "store" && <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <StoreImagePicker
                  label="Logo"
                  value={store.logoUrl}
                  type="logo"
                  isUploading={uploadingImage === "logo"}
                  onUpload={handleStoreImageUpload}
                  onRemove={store.logoUrl ? () => handleRemoveImage("logoUrl", "Logo") : undefined}
                />

                <StoreImagePicker
                  label="Icone"
                  value={store.iconUrl}
                  type="icon"
                  isUploading={uploadingImage === "icon"}
                  onUpload={handleStoreImageUpload}
                  onRemove={store.iconUrl ? () => handleRemoveImage("iconUrl", "Ícone") : undefined}
                />
              </SimpleGrid>}

              {section === "store" && <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <StoreImagePicker
                  label="Banner para desktop"
                  value={store.bannerUrl}
                  type="banner"
                  isUploading={uploadingImage === "banner"}
                  onUpload={handleStoreImageUpload}
                  onRemove={store.bannerUrl ? () => handleRemoveImage("bannerUrl", "Banner desktop") : undefined}
                  wide
                />
                <StoreImagePicker
                  label="Banner para celular (opcional)"
                  value={store.bannerMobileUrl}
                  type="banner-mobile"
                  isUploading={uploadingImage === "banner-mobile"}
                  onUpload={handleStoreImageUpload}
                  onRemove={store.bannerMobileUrl ? () => handleRemoveImage("bannerMobileUrl", "Banner mobile") : undefined}
                  mobile
                />
              </SimpleGrid>}

              {section === "payments" && <Box borderTop="1px solid #eee" pt={6}>
                <Heading size="md">Recebimentos</Heading>
                <Text color="gray.600" mt={1} mb={5}>
                  Conecte a conta Mercado Pago da loja. Os pagamentos são direcionados à conta autorizada.
                </Text>
                <Box border="1px solid" borderColor={mercadoPagoConfigured ? "brand.200" : "gray.200"} bg={mercadoPagoConfigured ? "brand.50" : "white"} borderRadius="lg" p={{ base: 3, sm: 5 }} mb={6}>
                  <HStack align="start" spacing={4} direction={{ base: "column", sm: "row" }}>
                    <Box bg="white" color="brand.800" borderRadius="lg" p={2}>
                      <Icon as={SiMercadopago} boxSize={12} />
                    </Box>
                    <Box flex="1" minW={0} w="full">
                      <HStack mb={4} justify="space-between" align="center" flexWrap="wrap">
                        <Heading size="sm">Mercado Pago · Checkout Pro</Heading>
                        {!isCompletePlan && (
                          <Button
                            as="a"
                            href="/dashboard/plan"
                            mt={4}
                            ml={{ base: 0, sm: 3 }}
                            variant="link"
                            colorScheme="brand"
                          >
                            Ver plano Completo
                          </Button>
                        )}
                      </HStack>
                      <Text color="gray.600" fontSize="sm" mt={2}>
                        O cliente será levado ao ambiente seguro do Mercado Pago para pagar e depois retorna à loja. Para ativar, o titular precisa ter uma conta de vendedor Mercado Pago e autorizar a conexão.
                      </Text>
                      <Text color={mercadoPagoConfigured ? "green.700" : "gray.600"} fontSize="sm" fontWeight="semibold" mt={3}>
                        {!isCompletePlan
                          ? mercadoPagoConfigured
                            ? "✓ Conta conectada; disponível no plano Completo"
                            : "Disponível no plano Completo"
                          : mercadoPagoConfigured
                            ? "✓ Conta Mercado Pago conectada"
                            : "○ Nenhuma conta Mercado Pago conectada"}
                      </Text>
                      <Button
                        mt={4}
                        leftIcon={<Icon boxSize={"30px"} as={SiMercadopago} />}
                        colorScheme="brand"
                        onClick={handleMercadoPagoConnect}
                        isDisabled={!isCompletePlan}
                        isLoading={mercadoPagoConnecting}
                        loadingText="Abrindo Mercado Pago"
                        width={{ base: "full", sm: "auto" }}
                        whiteSpace="normal"
                        height="auto"
                        minH="40px"
                        py={2}
                      >
                        {mercadoPagoConfigured ? "Reconectar conta Mercado Pago" : "Conectar Mercado Pago"}
                      </Button>
                    </Box>
                  </HStack>
                </Box>
              </Box>}

              {section === "shipping" && <Box borderTop="1px solid #eee" pt={6}>
                <Heading size="md">Frete</Heading>
                <Text color="gray.600" mt={1} mb={4}>
                  Configure as formas de entrega disponíveis no checkout.
                </Text>

                <Stack spacing={4}>
                  <Box borderWidth="1px" borderColor={store.pickupEnabled ? "brand.200" : "gray.200"} borderRadius="xl" bgColor={"white"} p={{ base: 3, sm: 5 }}>
                    <HStack justify="space-between" align="start" spacing={4}>
                      <Box>
                        <Text fontWeight="semibold">Retirada na loja</Text>
                        <Text fontSize="sm" color="gray.600">O cliente busca o pedido no endereço informado.</Text>
                      </Box>
                      <Switch
                        colorScheme="brand"
                        isChecked={store.pickupEnabled}
                        onChange={(event) => updateField("pickupEnabled", event.target.checked)}
                        aria-label="Permitir retirada na loja"
                      />
                    </HStack>
                    {store.pickupEnabled && (
                      <Stack spacing={3} mt={5} pt={4} borderTopWidth="1px" borderColor="gray.100">
                        <Text fontSize="sm" fontWeight="medium">Endereço para retirada</Text>
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                          <FormControl isRequired>
                            <FormLabel>CEP</FormLabel>
                            <Input
                              value={store.pickupAddress.zip}
                              placeholder="00000-000"
                              inputMode="numeric"
                              onChange={(event) => setStore((current) => ({ ...current, pickupAddress: { ...current.pickupAddress, zip: maskCep(event.target.value) } }))}
                              onBlur={(event) => lookupPickupAddress(event.target.value)}
                              focusBorderColor="#1f633c"
                            />
                            {pickupCepLoading && <Text fontSize="xs" color="gray.500" mt={1}>Consultando CEP…</Text>}
                          </FormControl>
                          <FormControl isRequired>
                            <FormLabel>Rua / avenida</FormLabel>
                            <Input value={store.pickupAddress.street} onChange={(event) => setStore((current) => ({ ...current, pickupAddress: { ...current.pickupAddress, street: event.target.value } }))} focusBorderColor="#1f633c" />
                          </FormControl>
                          <FormControl isRequired>
                            <FormLabel>Número</FormLabel>
                            <Input value={store.pickupAddress.number} onChange={(event) => setStore((current) => ({ ...current, pickupAddress: { ...current.pickupAddress, number: event.target.value } }))} focusBorderColor="#1f633c" />
                          </FormControl>
                          <FormControl isRequired>
                            <FormLabel>Bairro</FormLabel>
                            <Input value={store.pickupAddress.district} onChange={(event) => setStore((current) => ({ ...current, pickupAddress: { ...current.pickupAddress, district: event.target.value } }))} focusBorderColor="#1f633c" />
                          </FormControl>
                          <FormControl isRequired>
                            <FormLabel>Cidade</FormLabel>
                            <Input value={store.pickupAddress.city} onChange={(event) => setStore((current) => ({ ...current, pickupAddress: { ...current.pickupAddress, city: event.target.value } }))} focusBorderColor="#1f633c" />
                          </FormControl>
                          <FormControl isRequired>
                            <FormLabel>UF</FormLabel>
                            <Input value={store.pickupAddress.state} maxLength={2} textTransform="uppercase" onChange={(event) => setStore((current) => ({ ...current, pickupAddress: { ...current.pickupAddress, state: event.target.value.toUpperCase().replace(/[^A-Z]/g, "") } }))} focusBorderColor="#1f633c" />
                          </FormControl>
                          <FormControl>
                            <FormLabel>Ponto de referência <Text as="span" color="gray.500" fontWeight="normal">(opcional)</Text></FormLabel>
                            <Input value={store.pickupAddress.reference} onChange={(event) => setStore((current) => ({ ...current, pickupAddress: { ...current.pickupAddress, reference: event.target.value } }))} focusBorderColor="#1f633c" />
                          </FormControl>
                        </SimpleGrid>
                      </Stack>
                    )}
                  </Box>

                  <Box borderWidth="1px" borderColor={store.localDeliveryEnabled ? "brand.200" : "gray.200"} borderRadius="xl" bgColor={"white"} p={{ base: 3, sm: 5 }}>
                    {!isCompletePlan && (
                      <HStack mb={4} justify="space-between" align="center" flexWrap="wrap">
                        <Text fontSize="sm" color="gray.600">
                          Entrega local está disponível no plano Completo.
                        </Text>
                        <Button as="a" href="/dashboard/plan" size="sm" variant="link" colorScheme="brand">
                          Ver plano Completo
                        </Button>
                      </HStack>
                    )}
                    <Box
                      as="fieldset"
                      disabled={!isCompletePlan}
                      border="0"
                      m={0}
                      p={0}
                      minW={0}
                      opacity={!isCompletePlan ? 0.6 : 1}
                    >
                    <HStack justify="space-between" align="start" spacing={4}>
                      <Box>
                        <Text fontWeight="semibold">Entrega local</Text>
                        <Text fontSize="sm" color="gray.600">Defina uma área de atendimento por distância e o preço do frete.</Text>
                      </Box>
                      <Switch
                        colorScheme="brand"
                        isChecked={store.localDeliveryEnabled}
                        onChange={(event) => updateField("localDeliveryEnabled", event.target.checked)}
                        aria-label="Permitir entrega local"
                      />
                    </HStack>
                    {store.localDeliveryEnabled && (
                      <Stack spacing={4} mt={5} pt={4} borderTopWidth="1px" borderColor="gray.100">
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          <FormControl isRequired>
                            <FormLabel>CEP de saída dos pedidos</FormLabel>
                            <Input
                              value={store.shippingOriginZip}
                              placeholder="00000-000"
                              inputMode="numeric"
                              onChange={(event) => updateField("shippingOriginZip", maskCep(event.target.value))}
                              onBlur={(event) => lookupDeliveryOrigin(event.target.value)}
                              focusBorderColor="#1f633c"
                            />
                            {originCepLoading && <Text fontSize="xs" color="gray.500" mt={1}>Consultando CEP…</Text>}
                            {originAddressPreview && <Text fontSize="xs" color="gray.600" mt={1}>{originAddressPreview}</Text>}
                          </FormControl>
                          <FormControl>
                            <FormLabel>Prazo estimado</FormLabel>
                            <Input value={store.localDeliveryEta} placeholder="Ex: 1 a 3 dias úteis ou A combinar" onChange={(event) => updateField("localDeliveryEta", event.target.value)} focusBorderColor="#1f633c" />
                          </FormControl>
                          <FormControl>
                            <FormLabel>Frete grátis acima de</FormLabel>
                            <MoneyInput min={0} value={store.freeShippingMinAmount} onChange={(value) => updateField("freeShippingMinAmount", value)} focusBorderColor="#1f633c" />
                            <Text fontSize="xs" color="gray.500" mt={1}>Só vale para endereços dentro da área atendida.</Text>
                          </FormControl>
                        </SimpleGrid>
                        <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" p={4}>
                          <Stack direction={{ base: "column", sm: "row" }} justify="space-between" align={{ base: "stretch", sm: "start" }} spacing={3} mb={3}>
                            <Box minW={0}>
                              <Text fontWeight="semibold">Faixas por distância</Text>
                              <Text fontSize="sm" color="gray.600">A distância é aproximada em linha reta, a partir do CEP de saída.</Text>
                            </Box>
                            <Button type="button" size="sm" leftIcon={<FiPlus />} width={{ base: "full", sm: "auto" }} flexShrink={0} onClick={() => updateField("deliveryDistanceRanges", [...(store.deliveryDistanceRanges || []), { maxDistanceKm: "", fee: 0 }])}>
                              Adicionar faixa
                            </Button>
                          </Stack>
                          <Stack spacing={3}>
                            {(store.deliveryDistanceRanges || []).map((range, index) => (
                              <SimpleGrid key={index} columns={{ base: 1, md: 2 }} spacing={3} alignItems="end">
                                <FormControl isRequired minW={0}><FormLabel fontSize="sm">Até quantos km?</FormLabel><Input type="number" min="0.1" step="0.1" value={range.maxDistanceKm ?? ""} placeholder="Ex: 5" onChange={(event) => updateField("deliveryDistanceRanges", store.deliveryDistanceRanges.map((item, itemIndex) => itemIndex === index ? { ...item, maxDistanceKm: event.target.value } : item))} /></FormControl>
                                <HStack align="end" minW={0}><FormControl isRequired minW={0}><FormLabel fontSize="sm">Preço (R$)</FormLabel><MoneyInput min="0" value={range.fee} onChange={(fee) => updateField("deliveryDistanceRanges", store.deliveryDistanceRanges.map((item, itemIndex) => itemIndex === index ? { ...item, fee } : item))} /></FormControl><IconButton type="button" flexShrink={0} aria-label="Remover faixa" icon={<FiTrash2 />} variant="ghost" colorScheme="red" onClick={() => updateField("deliveryDistanceRanges", store.deliveryDistanceRanges.filter((_, itemIndex) => itemIndex !== index))} /></HStack>
                              </SimpleGrid>
                            ))}
                            {store.deliveryDistanceRanges.length === 0 && <Text fontSize="sm" color="gray.500">Adicione ao menos uma faixa, por exemplo: até 5 km por R$ 8,00.</Text>}
                          </Stack>
                        </Box>
                        <Text fontSize="xs" color="gray.500">O CEP é usado para calcular uma distância aproximada; isso não representa a rota real por ruas. Revise as faixas para cobrir apenas onde sua loja consegue entregar.</Text>
                      </Stack>
                    )}
                    </Box>
                  </Box>

                  <Box
                    borderWidth="1px"
                    borderColor={melhorEnvioConfigured ? "brand.200" : "gray.200"}
                    borderRadius="xl"
                    bgColor={"white"}
                    p={{ base: 3, sm: 5 }}
                  >
                    {!isCompletePlan && (
                      <HStack mb={4} justify="space-between" align="center" flexWrap="wrap">
                        <Text fontSize="sm" color="gray.600">
                          Melhor Envio está disponível no plano Completo.
                        </Text>
                        <Button as="a" href="/dashboard/plan" size="sm" variant="link" colorScheme="brand">
                          Ver plano Completo
                        </Button>
                      </HStack>
                    )}
                    <Box
                      as="fieldset"
                      disabled={!isCompletePlan}
                      border="0"
                      m={0}
                      p={0}
                      minW={0}
                      opacity={!isCompletePlan ? 0.6 : 1}
                    >
                      <HStack justify="space-between" align="start" spacing={4}>
                        <Box>
                            <Text fontWeight="semibold">Melhor Envio</Text>
                          <Text fontSize="sm" color="gray.600">Calcule opções de transportadoras e mostre o frete no checkout. </Text>
                        </Box>
                        <Switch
                          colorScheme="brand"
                          isChecked={melhorEnvioOpen}
                          onChange={(event) => setMelhorEnvioOpen(event.target.checked)}
                          isDisabled={!isCompletePlan}
                          aria-label="Abrir configuração do Melhor Envio"
                        />
                      </HStack>
                      {melhorEnvioOpen && (
                        <Box mt={5} pt={4} borderTopWidth="1px" borderColor="gray.100">
                          <Text fontSize="sm" color="gray.600">
                            Conecte sua conta do Melhor Envio para consultar transportadoras, prazos e preços automaticamente no checkout. Você será levado ao ambiente seguro do Melhor Envio para autorizar a integração.
                          </Text>
                          <Text
                            fontSize="sm"
                            color={melhorEnvioConfigured ? "green.700" : "gray.600"}
                            fontWeight="semibold"
                            mt={3}
                          >
                            {melhorEnvioConfigured
                              ? "✓ Conta Melhor Envio conectada"
                              : "○ Nenhuma conta Melhor Envio conectada"}
                          </Text>
                          {melhorEnvioConfigured && (
                            <Box mt={3} p={3} borderWidth="1px" borderColor="green.100" borderRadius="md" bg="green.50">
                              <Text fontSize="xs" fontWeight="bold" color="green.800" textTransform="uppercase">
                                Endereço de postagem sincronizado
                              </Text>
                              {store.melhorEnvioOriginAddress?.zip ? (
                                <Text fontSize="sm" color="gray.700" mt={1}>
                                  {store.melhorEnvioOriginAddress.street}, {store.melhorEnvioOriginAddress.number} — {store.melhorEnvioOriginAddress.district}, {store.melhorEnvioOriginAddress.city}/{store.melhorEnvioOriginAddress.state} — CEP {store.melhorEnvioOriginAddress.zip}
                                </Text>
                              ) : (
                                <Text fontSize="sm" color="orange.700" mt={1}>
                                  Não encontramos um endereço de postagem nessa conta. Reconecte após configurá-lo no Melhor Envio.
                                </Text>
                              )}
                            </Box>
                          )}
                          <Button
                            mt={4}
                            leftIcon={<Icon as={FiTruck} boxSize={5} />}
                            colorScheme="brand"
                            onClick={handleMelhorEnvioConnect}
                            isLoading={melhorEnvioConnecting}
                            loadingText="Abrindo Melhor Envio"
                            width={{ base: "full", sm: "auto" }}
                            whiteSpace="normal"
                            height="auto"
                            minH="40px"
                            py={2}
                          >
                            {melhorEnvioConfigured ? "Reconectar conta Melhor Envio" : "Conectar Melhor Envio"}
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Stack>
              </Box>}

              {section !== "payments" && <Box
                  borderWidth="1px" borderColor="brand.200" borderRadius="xl" bgColor={"white"}
                  p={{ base: 3, sm: 5 }}
                  mt={3}
                >
                  <Stack
                    direction={{ base: "column", sm: "row" }}
                    justify="space-between"
                    align={{ base: "stretch", sm: "center" }}
                    spacing={3}
                  >
                    <Box minW={0}>
                      <Text fontWeight="semibold">Pronto para atualizar?</Text>
                      <Text color="gray.500" fontSize="sm">
                        {section === "payments" ? "Salva a configuração de recebimentos." : section === "shipping" ? "Salva as opções de entrega da loja." : "Salva dados, contato e imagens."}
                      </Text>
                    </Box>
                    <Button
                      type="submit"
                      leftIcon={<FiSave />}
                      colorScheme="brand"
                      color="white"
                      isLoading={saving}
                      flexShrink={0}
                      width={{ base: "full", sm: "auto" }}
                    >
                      {section === "shipping" ? "Salvar frete" : "Salvar loja"}
                    </Button>
                  </Stack>
                </Box>}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </SidebarWithHeader>
  );
};

const StoreImagePicker = ({
  label,
  value,
  type,
  isUploading,
  onUpload,
  onRemove,
  wide = false,
  mobile = false,
}) => {
  const inputId = `store-image-${type}`;
  const isDefaultAsset = ["logos/local", "banners/local", "banners/local_mobile"].includes(value);
  const hasPreview = Boolean(value) && !isDefaultAsset;
  const previewUrl = value
    ? value.match(/^https?:\/\//i)
      ? value
      : `/${value.replace(/^\/+/, "").replace(/\.png$/i, "")}.png`
    : "";

  return (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      <Box
        border="1px solid #e2e8f0"
        borderRadius="md"
        overflow="hidden"
        backgroundColor="gray.50"
        width="100%"
      >
        <Box
          width="100%"
          height={"180px"}
          display="flex"
          alignItems="center"
          justifyContent="center"
          overflow="hidden"
          backgroundColor={"white"}
        >
          {hasPreview ? (
            <Box
              width={mobile ? "180px" : "100%"}
              height="100%"
              flexShrink={0}
              overflow="hidden"
              borderRadius={"none"}
              boxShadow={"none"}
            >
              <Image
                src={previewUrl}
                alt={label}
                width="100%"
                height="100%"
                objectFit={mobile ? "cover" : wide ? "cover" : "contain"}
                objectPosition="center"
                display="block"
              />
            </Box>
          ) : (
            <Stack alignItems="center" color="gray.500" spacing={2}>
              <FiImage size={24} />
              <Text fontSize="sm">Nenhuma imagem enviada</Text>
            </Stack>
          )}
        </Box>

        <Box padding={3}>
          <Input
            id={inputId}
            type="file"
            accept="image/*"
            display="none"
            onChange={(event) => {
              onUpload(type, event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button
            as="label"
            htmlFor={inputId}
            leftIcon={<FiUpload />}
            isLoading={isUploading}
            width="full"
            cursor="pointer"
          >
            Escolher imagem
          </Button>
          <HStack mt={2} minH="8" justify="space-between" align="center" spacing={2}>
            <Text fontSize="xs" color="gray.600" lineHeight="short">
              {mobile
                ? "Recomendado: imagem quadrada (proporção 1:1), ideal para telas pequenas."
                : wide
                  ? "Recomendado: faixa horizontal (proporção 2,15:1), usada no banner desktop."
                  : type === "icon"
                    ? "Recomendado: imagem quadrada (proporção 1:1), de preferência em PNG."
                    : "Recomendado: imagem horizontal com fundo transparente (proporção aproximada 3:1)."}
            </Text>
            {onRemove && (
              <Button
                size="xs"
                variant="link"
                colorScheme="red"
                flexShrink={0}
                onClick={onRemove}
                isDisabled={isUploading}
              >
                Remover
              </Button>
            )}
          </HStack>
        </Box>
      </Box>
    </FormControl>
  );
};

export default StoreSettings;
