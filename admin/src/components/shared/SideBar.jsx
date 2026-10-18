import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Avatar,
  CloseButton,
  Drawer,
  DrawerContent,
  Flex,
  HStack,
  Icon,
  IconButton,
  Image,
  Link,
  Stack,
  Text,
  useBreakpointValue,
  useDisclosure,
} from "@chakra-ui/react";

import {
  FiExternalLink,
  FiHome,
  FiLogOut,
  FiMenu,
  FiPackage,
  FiTruck,
  FiCreditCard,
  FiLayers,
  FiSettings,
  FiTag,
  FiUsers,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

import { Link as RouterLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getStorefrontUrl, getStoreInfo } from "../../services/client.js";

export default function SidebarWithHeader({ children }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isDesktop = useBreakpointValue({ base: false, lg: true });
  return (
    <Box minH="100vh">
      {!isDesktop ? (
        <Drawer
          autoFocus={false}
          placement="left"
          isOpen={isOpen}
          onClose={onClose}
          returnFocusOnClose={false}
          onOverlayClick={onClose}
          size="full"
        >
          <DrawerContent maxW="100vw" minH="100vh">
            <SidebarContent onClose={onClose} />
          </DrawerContent>
        </Drawer>
      ) : (
        <Box
          w="300px"
          pos="fixed"
          h="100vh"
          borderRight="1px solid"
          borderColor="#103d2b"
          bg="#082f1e"
          boxShadow="xl"
        >
          <SidebarContent onClose={() => {}} />
        </Box>
      )}

      <MobileNav onOpen={onOpen} />
      <Box
        ml={{ base: 0, lg: "300px" }}
        px={{ base: 3, md: 7, xl: 10 }}
        py={{ base: 3, lg: 8 }}
        pt={{ base: 16, lg: 8 }}
        w={{ base: "full", lg: "calc(100% - 300px)" }}
        mx="auto"
      >
        {children}
      </Box>
    </Box>
  );
}

const SidebarContent = ({ onClose, ...rest }) => {
  const { logOut, customer } = useAuth();
  const [storeUrl, setStoreUrl] = useState("");

  useEffect(() => {
    getStoreInfo()
      .then((response) => {
        setStoreUrl(getStorefrontUrl(response.data?.domain));
      })
      .catch(() => {
        setStoreUrl("");
      });
  }, []);

  const administrar = [
    { name: "Clientes", route: "/dashboard/customers", icon: FiUsers },
    { name: "Produtos", route: "/dashboard/products", icon: FiPackage },
  ];

  const configuracao = [
    {
      name: "Personalização",
      route: "/dashboard/store",
      icon: FiSettings,
    },
    { name: "Recebimentos", route: "/dashboard/payments", icon: FiCreditCard },
    { name: "Frete", route: "/dashboard/shipping", icon: FiTruck },
    { name: "Plano e cobrança", route: "/dashboard/plan", icon: FiLayers },
    { name: "Categorias", route: "/dashboard/categories", icon: FiTag },
  ];
  return (
    <Stack
      transition="all 150ms ease"
      backgroundColor="#082f1e"
      color="white"
      w="full"
      pos="relative"
      h="full"
      overflowY="auto"
      {...rest}
    >
      <Flex
        align="center"
        justify="space-between"
        px={5}
        pt={5}
        pb={4}
      >
        <HStack spacing={3}>
          <Image
            src="/brand-mark-dark.png"
            alt="KIZI"
            boxSize="60px"
            objectFit="contain"
          />
          <Box>
            <Text fontSize="sm" fontWeight="bold" color="white">
              KIZI
            </Text>
            <Text fontSize="xs" color="whiteAlpha.600">
              PAINEL DA LOJA
            </Text>
          </Box>
        </HStack>
        <CloseButton display={{ base: "flex", md: "none" }} onClick={onClose} />
      </Flex>

      <Stack px={3} gap={1} pt={3} flex="1">
        <Text px={3} pb={1} fontSize="xs" fontWeight="bold" color="whiteAlpha.500" textTransform="uppercase" letterSpacing="wider">
          Visão geral
        </Text>
        <NavItem route="/dashboard" icon={FiHome} onClick={onClose}>
          Início
        </NavItem>
        <Text px={3} pt={5} pb={1} fontSize="xs" fontWeight="bold" color="whiteAlpha.500" textTransform="uppercase" letterSpacing="wider">
          Administrar
        </Text>
        {administrar.map((link) => (
          <NavItem key={link.name} route={link.route} icon={link.icon} onClick={onClose}>
            {link.name}
          </NavItem>
        ))}
        <Text px={3} pt={5} pb={1} fontSize="xs" fontWeight="bold" color="whiteAlpha.500" textTransform="uppercase" letterSpacing="wider">
          Configurações
        </Text>
        {configuracao.map((link) => (
          <NavItem key={link.name} route={link.route} icon={link.icon} onClick={onClose}>
            {link.name}
          </NavItem>
        ))}
      </Stack>

      <Stack px={3} py={6} spacing={2}>
        <Button
          as="a"
          href="https://wa.me/5527995074930?text=Oi%21%20Preciso%20de%20ajuda%20com%20minha%20loja%20na%20KIZI."
          target="_blank"
          rel="noreferrer"
          leftIcon={<FaWhatsapp />}
          size="sm"
          variant="outline"
          borderColor="whiteAlpha.300"
          color="white"
          _hover={{ bg: "whiteAlpha.100", borderColor: "whiteAlpha.500" }}
          justifyContent="flex-start"
          aria-label="Falar com o suporte humano grátis pelo WhatsApp"
        >
          Suporte grátis
        </Button>
        {storeUrl && (
          <Button
            as="a"
            href={storeUrl}
            target="_blank"
            rel="noreferrer"
            leftIcon={<FiExternalLink />}
            size="sm"
            variant="outline"
            borderColor="whiteAlpha.300"
            color="white"
            _hover={{ bg: "whiteAlpha.100" }}
            justifyContent="flex-start"
          >
            Ver loja
          </Button>
        )}
          <HStack
          borderTop="1px solid"
          borderColor="whiteAlpha.200"
          pt={4}
          spacing={3}
        >
          <Link as={RouterLink} to="/dashboard/profile" flex="1" minW={0} _hover={{ textDecoration: "none" }}>
            <HStack spacing={3}>
              <Avatar name={customer?.username || "Lojista"} size="sm" bg="brand.600" color="white" />
              <Box minW={0}>
                <Text fontSize="sm" fontWeight="semibold" noOfLines={1} color="white">{customer?.username || "Sua conta"}</Text>
                <Text fontSize="xs" color="whiteAlpha.600">Meu perfil</Text>
              </Box>
            </HStack>
          </Link>
          <IconButton
            aria-label="Sair da conta"
            icon={<FiLogOut />}
            onClick={logOut}
            size="sm"
            variant="ghost"
            color="whiteAlpha.700"
            _hover={{ bg: "whiteAlpha.100", color: "white" }}
          />
        </HStack>
      </Stack>
    </Stack>
  );
};

const NavItem = ({ icon, route, children, ...rest }) => {
  const { pathname } = useLocation();
  const isActive = route === pathname;
  const content = (
    <Flex
      align="center"
      borderRadius="xl"
      px={3}
      py={2.5}
      minH="44px"
      fontSize="sm"
      fontWeight={isActive ? "semibold" : "medium"}
      color={isActive ? "white" : "whiteAlpha.800"}
      bg={isActive ? "brand.600" : "transparent"}
      cursor="pointer"
      transition="all 160ms ease"
      _hover={{
        bg: isActive ? "brand.600" : "whiteAlpha.100",
        color: "white",
      }}
      _focusVisible={{
        outline: "2px solid",
        outlineColor: "brand.300",
        outlineOffset: "2px",
      }}
      as={route ? "div" : "button"}
      type={route ? undefined : "button"}
      {...rest}
    >
      {icon && (
        <Icon
          mr="3"
          fontSize="17px"
          color={isActive ? "white" : "whiteAlpha.600"}
          as={icon}
        />
      )}
      {children}
    </Flex>
  );

  if (!route) {
    return content;
  }

  return (
    <Link
      as={RouterLink}
      to={route}
      aria-current={isActive ? "page" : undefined}
      style={{ textDecoration: "none" }}
      _focusVisible={{ boxShadow: "outline", borderRadius: "xl" }}
    >
      {content}
    </Link>
  );
};

const MobileNav = ({ onOpen, ...rest }) => {
  const isDesktop = useBreakpointValue({ base: false, lg: true });
  return (
    <Flex
      ml={{ base: 0, md: 0 }}
      px={4}
      height="16"
      alignItems="center"
      display={isDesktop ? "none" : "flex"}
      justifyItems={"center"}
      backgroundColor="#082f1e"
      color="white"
      position="fixed"
      width="full"
      zIndex="50"
      borderBottom="1px solid"
      borderBottomColor="#103d2b"
      justifyContent="space-between"
      {...rest}
    >
      <HStack spacing={3}>
        <Image
          src="/brand-mark-dark.png"
          alt="KIZI"
          boxSize="34px"
          objectFit="contain"
        />
      </HStack>
      <IconButton
        onClick={onOpen}
        variant="ghost"
        color="white"
        _hover={{ bg: "whiteAlpha.100" }}
        aria-label="Abrir menu"
        icon={<FiMenu />}
      />
    </Flex>
  );
};
