import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
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
  Text,
} from "@chakra-ui/react";
import SidebarWithHeader from "./components/shared/SideBar.jsx";
import PageHeader from "./components/shared/PageHeader.jsx";
import {
  getStorefrontUrl,
  getStoreInfo,
  updateStoreInfo,
  uploadStoreImage,
} from "./services/client.js";
import {
  errorNotification,
  successNotification,
} from "./services/notification.js";
import {
  FiCopy,
  FiExternalLink,
  FiGlobe,
  FiImage,
  FiSave,
  FiUpload,
} from "react-icons/fi";

const StoreSettings = () => {
  const [store, setStore] = useState({
    name: "",
    domain: "",
    logoUrl: "",
    bannerUrl: "",
    iconUrl: "",
    instagram: "",
    whatsapp: "",
    pickupEnabled: true,
    localDeliveryEnabled: true,
    localDeliveryFee: 0,
    freeShippingMinAmount: 0,
    shippingOriginZip: "",
    localDeliveryEta: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState("");

  useEffect(() => {
    getStoreInfo()
      .then((res) => {
        setStore({
          name: res.data.name || "",
          domain: res.data.domain || "",
          logoUrl: res.data.logoUrl || "",
          bannerUrl: res.data.bannerUrl || "",
          iconUrl: res.data.iconUrl || "",
          instagram: res.data.instagram || "",
          whatsapp: res.data.whatsapp || "",
          pickupEnabled: res.data.pickupEnabled !== false,
          localDeliveryEnabled: res.data.localDeliveryEnabled !== false,
          localDeliveryFee: res.data.localDeliveryFee || 0,
          freeShippingMinAmount: res.data.freeShippingMinAmount || 0,
          shippingOriginZip: res.data.shippingOriginZip || "",
          localDeliveryEta: res.data.localDeliveryEta || "",
        });
      })
      .catch((err) => {
        errorNotification(
          err.code || "Erro",
          err.response?.data?.message || "Falha ao carregar dados da loja",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const updateField = (field, value) => {
    setStore((current) => ({ ...current, [field]: value }));
  };

  const centsToDecimal = (value) => (Number(value || 0) / 100).toFixed(2);
  const decimalToCents = (value) => {
    const parsed = Number(String(value || "0").replace(",", "."));
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await updateStoreInfo(store);
      setStore({
        name: response.data.name || "",
        domain: response.data.domain || "",
        logoUrl: response.data.logoUrl || "",
        bannerUrl: response.data.bannerUrl || "",
        iconUrl: response.data.iconUrl || "",
        instagram: response.data.instagram || "",
        whatsapp: response.data.whatsapp || "",
        pickupEnabled: response.data.pickupEnabled !== false,
        localDeliveryEnabled: response.data.localDeliveryEnabled !== false,
        localDeliveryFee: response.data.localDeliveryFee || 0,
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
      setStore({
        name: response.data.name || "",
        domain: response.data.domain || "",
        logoUrl: response.data.logoUrl || "",
        bannerUrl: response.data.bannerUrl || "",
        iconUrl: response.data.iconUrl || "",
        instagram: response.data.instagram || "",
        whatsapp: response.data.whatsapp || "",
        pickupEnabled: response.data.pickupEnabled !== false,
        localDeliveryEnabled: response.data.localDeliveryEnabled !== false,
        localDeliveryFee: response.data.localDeliveryFee || 0,
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

  if (loading) {
    return (
      <SidebarWithHeader>
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="#5f5482"
          size="xl"
        />
      </SidebarWithHeader>
    );
  }

  return (
    <SidebarWithHeader>
      <Box maxW="7xl" mx="auto" px={{ base: 2, md: 6 }} py={{ base: 4, md: 8 }}>
        <Stack spacing={6}>
          <PageHeader
            title="Loja"
            description="Contato e identidade visual usados na vitrine."
          />

          {store.domain && (
            <Box
              border="1px solid"
              borderColor="purple.100"
              borderRadius="md"
              bg="purple.50"
              p={4}
            >
              <HStack spacing={3} align="flex-start">
                <Icon as={FiGlobe} color="#5f5482" mt={1} />
                <Box flex="1" minW={0}>
                  <Text fontWeight="bold">Endereço público da loja</Text>
                  <Text color="gray.600" wordBreak="break-all">
                    {getStorefrontUrl(store.domain)}
                  </Text>
                </Box>
                <HStack flexShrink={0}>
                  <IconButton
                    aria-label="Copiar endereço da loja"
                    icon={<FiCopy />}
                    variant="ghost"
                    colorScheme="purple"
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
                    colorScheme="purple"
                  />
                </HStack>
              </HStack>
            </Box>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={5}>
              <FormControl>
                <FormLabel>Nome da loja</FormLabel>
                <Input
                  value={store.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  focusBorderColor="#5f5482"
                />
              </FormControl>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>WhatsApp</FormLabel>
                  <Input
                    value={store.whatsapp}
                    onChange={(event) =>
                      updateField("whatsapp", event.target.value)
                    }
                    focusBorderColor="#5f5482"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Instagram</FormLabel>
                  <Input
                    value={store.instagram}
                    onChange={(event) =>
                      updateField("instagram", event.target.value)
                    }
                    focusBorderColor="#5f5482"
                  />
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <StoreImagePicker
                  label="Logo"
                  value={store.logoUrl}
                  type="logo"
                  isUploading={uploadingImage === "logo"}
                  onUpload={handleStoreImageUpload}
                />

                <StoreImagePicker
                  label="Icone"
                  value={store.iconUrl}
                  type="icon"
                  isUploading={uploadingImage === "icon"}
                  onUpload={handleStoreImageUpload}
                />
              </SimpleGrid>

              <StoreImagePicker
                label="Banner"
                value={store.bannerUrl}
                type="banner"
                isUploading={uploadingImage === "banner"}
                onUpload={handleStoreImageUpload}
                wide
              />

              <Box borderTop="1px solid #eee" pt={6}>
                <Heading size="md">Frete</Heading>
                <Text color="gray.600" mt={1} mb={4}>
                  Configure formas simples de entrega para vender sem integração externa.
                </Text>

                <Stack spacing={4}>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <Checkbox
                      isChecked={store.pickupEnabled}
                      onChange={(event) =>
                        updateField("pickupEnabled", event.target.checked)
                      }
                    >
                      Permitir retirada na loja
                    </Checkbox>

                    <Checkbox
                      isChecked={store.localDeliveryEnabled}
                      onChange={(event) =>
                        updateField("localDeliveryEnabled", event.target.checked)
                      }
                    >
                      Permitir entrega local
                    </Checkbox>
                  </SimpleGrid>

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <FormControl>
                      <FormLabel>Valor da entrega local</FormLabel>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={centsToDecimal(store.localDeliveryFee)}
                        onChange={(event) =>
                          updateField(
                            "localDeliveryFee",
                            decimalToCents(event.target.value),
                          )
                        }
                        focusBorderColor="#5f5482"
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Frete grátis acima de</FormLabel>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={centsToDecimal(store.freeShippingMinAmount)}
                        onChange={(event) =>
                          updateField(
                            "freeShippingMinAmount",
                            decimalToCents(event.target.value),
                          )
                        }
                        focusBorderColor="#5f5482"
                      />
                    </FormControl>
                  </SimpleGrid>

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <FormControl>
                      <FormLabel>CEP de origem</FormLabel>
                      <Input
                        value={store.shippingOriginZip}
                        onChange={(event) =>
                          updateField("shippingOriginZip", event.target.value)
                        }
                        focusBorderColor="#5f5482"
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Prazo da entrega local</FormLabel>
                      <Input
                        value={store.localDeliveryEta}
                        placeholder="Ex: 1 a 3 dias úteis"
                        onChange={(event) =>
                          updateField("localDeliveryEta", event.target.value)
                        }
                        focusBorderColor="#5f5482"
                      />
                    </FormControl>
                  </SimpleGrid>
                </Stack>
              </Box>

              <Box
                borderTop="1px solid"
                borderColor="gray.100"
                bg="white"
                pt={4}
                mt={2}
              >
                <HStack justify="space-between" align="center" spacing={4}>
                  <Box>
                    <Text fontWeight="semibold">Pronto para atualizar?</Text>
                    <Text color="gray.500" fontSize="sm">
                      Salva dados, contato, imagens e frete.
                    </Text>
                  </Box>
                  <Button
                    type="submit"
                    leftIcon={<FiSave />}
                    backgroundColor="#5f5482"
                    color="white"
                    isLoading={saving}
                    flexShrink={0}
                  >
                    Salvar loja
                  </Button>
                </HStack>
              </Box>
            </Stack>
          </form>
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
  wide = false,
}) => {
  const inputId = `store-image-${type}`;
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
      >
        <Box
          height={wide ? "180px" : "120px"}
          display="flex"
          alignItems="center"
          justifyContent="center"
          backgroundColor="white"
        >
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={label}
              width="100%"
              height="100%"
              objectFit={wide ? "cover" : "contain"}
            />
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
        </Box>
      </Box>
    </FormControl>
  );
};

export default StoreSettings;
