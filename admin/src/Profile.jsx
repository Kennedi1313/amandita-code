import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  Input,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { FiCamera, FiLogOut, FiSave } from "react-icons/fi";
import SidebarWithHeader from "./components/shared/SideBar.jsx";
import PageHeader from "./components/shared/PageHeader.jsx";
import { useAuth } from "./components/context/AuthContext.jsx";
import {
  customerProfilePictureUrl,
  getCustomerByEmail,
  getStoreInfo,
  updateCustomer,
  updateStoreInfo,
  uploadCustomerProfilePicture,
} from "./services/client.js";
import {
  errorNotification,
  successNotification,
} from "./services/notification.js";

const emptyProfile = {
  id: null,
  name: "",
  email: "",
  cpf: "",
  phone: "",
  instagram: "",
  whatsapp: "",
  storeName: "",
};

const Profile = () => {
  const { customer } = useAuth();
  const [profile, setProfile] = useState(emptyProfile);
  const [store, setStore] = useState({ instagram: "", whatsapp: "" });
  const [address, setAddress] = useState({
    zip: "",
    street: "",
    number: 0,
    district: "",
    city: "",
    reference: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!customer?.username) {
      return;
    }

    Promise.all([getCustomerByEmail(customer?.username), getStoreInfo()])
      .then(([customerResponse, storeResponse]) => {
        const customerData = customerResponse.data;
        setAddress(customerData.addresses?.[0] || address);
        setProfile({
          id: customerData.id,
          name: customerData.name || "",
          email: customerData.email || "",
          cpf: customerData.cpf || "",
          phone: customerData.phone || "",
          instagram: storeResponse.data.instagram || "",
          whatsapp: storeResponse.data.whatsapp || "",
          storeName: storeResponse.data.name || "",
        });
        setStore(storeResponse.data);
      })
      .catch((error) => {
        errorNotification(
          "Não foi possível carregar seu perfil",
          error.response?.data?.message || "Tente novamente em instantes.",
        );
      })
      .finally(() => setLoading(false));
  }, [customer?.username]);

  const updateField = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateCustomer(profile.id, {
        name: profile.name,
        email: profile.email,
        age: 18,
        role: null,
        cpf: profile.cpf,
        phone: profile.phone,
        ...address,
      });
      const storeResponse = await updateStoreInfo({
        ...store,
        name: profile.storeName,
        instagram: profile.instagram,
        whatsapp: profile.whatsapp,
      });
      setStore(storeResponse.data);
      successNotification("Perfil atualizado", "Seus dados foram salvos com sucesso.");
    } catch (error) {
      errorNotification(
        "Não foi possível salvar",
        error.response?.data?.message || "Confira os dados e tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !profile.id) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await uploadCustomerProfilePicture(profile.id, formData);
      successNotification("Foto atualizada", "Sua nova foto já está no perfil.");
      setProfile((current) => ({ ...current }));
    } catch (error) {
      errorNotification("Não foi possível atualizar a foto", "Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <SidebarWithHeader><Box py={12} textAlign="center"><Spinner color="brand.500" /></Box></SidebarWithHeader>;
  }

  return (
    <SidebarWithHeader>
      <Box maxW="7xl" mx="auto" px={{ base: 0, md: 6 }} py={{ base: 3, md: 8 }}>
        <Stack spacing={6}>
          <PageHeader
            title="Meu perfil"
            description="Gerencie seus dados pessoais e os canais de contato da sua loja."
          />
          <Box as="form" onSubmit={handleSubmit} w="full" mx="auto">
            <Stack spacing={6}>
          <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="2xl" p={{ base: 3, sm: 5 }} shadow="sm">
            <Stack direction={{ base: "column", md: "row" }} align={{ base: "start", md: "center" }} spacing={5}>
              <Box position="relative">
                <Avatar
                  name={profile.name}
                  src={profile.id ? customerProfilePictureUrl(profile.id) : undefined}
                  size="xl"
                  bg="brand.600"
                />
                <Button as="label" htmlFor="profile-image" position="absolute" bottom="0" right="0" size="sm" borderRadius="full" p={0} minW="36px" aria-label="Alterar foto" cursor="pointer">
                  <FiCamera />
                </Button>
                <Input id="profile-image" type="file" accept="image/*" display="none" onChange={handleImageChange} disabled={uploading} />
              </Box>
              <Box>
                <Text fontSize="sm" textTransform="uppercase" letterSpacing="wider" color="gray.500">Perfil do administrador</Text>
                <Heading size="lg" mt={1}>{profile.name || "Seu perfil"}</Heading>
                <Text color="gray.600" mt={1}>{profile.email}</Text>
                <Text fontSize="sm" color="gray.500" mt={3}>A foto e os dados abaixo são usados para identificar você no painel.</Text>
              </Box>
            </Stack>
          </Box>

          <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="2xl" p={{ base: 3, sm: 5 }} shadow="sm">
            <Heading size="md">Informações pessoais</Heading>
            <Text color="gray.600" fontSize="sm" mt={1}>Mantenha seus dados de contato atualizados.</Text>
            <Divider my={5} />
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
              <FormControl><FormLabel>Nome completo</FormLabel><Input value={profile.name} onChange={(event) => updateField("name", event.target.value)} /></FormControl>
              <FormControl><FormLabel>Email</FormLabel><Input value={profile.email} isReadOnly bg="gray.50" /></FormControl>
              <FormControl><FormLabel>CPF</FormLabel><Input value={profile.cpf} onChange={(event) => updateField("cpf", event.target.value)} /></FormControl>
              <FormControl><FormLabel>Telefone/WhatsApp pessoal</FormLabel><Input value={profile.phone} onChange={(event) => updateField("phone", event.target.value)} /></FormControl>
              <FormControl><FormLabel>Nome da loja</FormLabel><Input value={profile.storeName} onChange={(event) => updateField("storeName", event.target.value)} /></FormControl>
            </SimpleGrid>
          </Box>

          <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="2xl" p={{ base: 3, sm: 5 }} shadow="sm">
            <Heading size="md">Canais da loja</Heading>
            <Text color="gray.600" fontSize="sm" mt={1}>Esses contatos ficam disponíveis para os clientes na sua loja.</Text>
            <Divider my={5} />
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
              <FormControl><FormLabel>WhatsApp da loja</FormLabel><Input value={profile.whatsapp} onChange={(event) => updateField("whatsapp", event.target.value)} placeholder="(00) 00000-0000" /></FormControl>
              <FormControl><FormLabel>Instagram da loja</FormLabel><Input value={profile.instagram} onChange={(event) => updateField("instagram", event.target.value)} placeholder="@sualoja" /></FormControl>
            </SimpleGrid>
          </Box>

              <Box border="1px solid" borderColor="brand.200" bgColor={"white"} borderRadius="xl" p={{ base: 3, sm: 5 }}>
                <Stack direction={{ base: "column", sm: "row" }} justify="space-between" align={{ base: "stretch", sm: "center" }} spacing={3}>
                  <Box minW={0}>
                    <Text fontWeight="semibold">Pronto para atualizar?</Text>
                    <Text color="gray.500" fontSize="sm">Salva seus dados pessoais e os canais de contato da loja.</Text>
                  </Box>
                  <Button type="submit" leftIcon={<FiSave />} colorScheme="brand" color="white" isLoading={saving} flexShrink={0} width={{ base: "full", sm: "auto" }}>
                    Salvar alterações
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </SidebarWithHeader>
  );
};

export default Profile;
