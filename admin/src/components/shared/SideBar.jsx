import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CloseButton,
  Drawer,
  DrawerContent,
  Flex,
  HStack,
  Icon,
  IconButton,
  Image,
  Link,
  Menu,
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
  FiSettings,
  FiTag,
  FiUsers,
} from "react-icons/fi";

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
          placement={"right"}
          isOpen={isOpen}
          onClose={onClose}
          returnFocusOnClose={false}
          onOverlayClick={onClose}
          size="xs"
        >
          <DrawerContent>
            <SidebarContent onClose={onClose} />
          </DrawerContent>
        </Drawer>
      ) : (
        <Box
          w="15%"
          maxW={"15%"}
          pos="fixed"
          h="100vh"
          borderRight="1px solid"
          borderColor="gray.200"
          bg="white"
        >
          <SidebarContent onClose={() => {}} />
        </Box>
      )}

      <MobileNav onClose={() => onClose} onOpen={onOpen} />
      <Box
        ml={{ base: 0, md: "15%" }} // aplica margem só no desktop
        p="2"
        pt="16"
        w={{ base: "100%", md: "85%" }} // ocupa 85% quando o menu está fixo
        maxW={{ base: "full", lg: "85%" }}
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
      name: "Loja",
      route: "/dashboard/store",
      icon: FiSettings,
    },
    { name: "Categorias", route: "/dashboard/categories", icon: FiTag },
  ];
  return (
    <Stack
      transition="3s ease"
      backgroundColor={"#5F5482"}
      textColor={"white"}
      w={{ base: "full", md: "15%" }}
      pos="fixed"
      h="full"
      {...rest}
    >
      <Flex
        flexDirection="column"
        alignItems="center"
        mx="8"
        mt={2}
        justifyContent="space-between"
      >
        <CloseButton display={{ base: "flex", md: "none" }} onClick={onClose} />
      </Flex>
      <Flex
        display={{ base: "none", md: "flex" }}
        justifyContent={"start"}
        px={4}
        gap={4}
        alignSelf={"center"}
        rounded={"md"}
        backgroundColor={"#5F5482"}
        textColor={"white"}
        w={{ base: "full", md: "full" }}
        h="35px"
      >
        <Image
          src="/icon_sem_fundo.png"
          alt="Logo"
          boxSize="35px"
          objectFit="contain"
          alignSelf="center"
        />
        <Text alignSelf={"center"}>Mostra Digital</Text>
      </Flex>

      <Stack pl={4} pr={4} gap={2} pt={8}>
        <NavItem route={"/dashboard"} icon={FiHome}>
          {"Inicio"}
        </NavItem>
        <Text fontSize={"sm"} fontWeight={"bold"}>
          Administrar
        </Text>
        {administrar.map((link) => (
          <NavItem key={link.name} route={link.route} icon={link.icon}>
            {link.name}
          </NavItem>
        ))}
        <Text fontSize={"sm"} fontWeight={"bold"}>
          Configurações
        </Text>
        {configuracao.map((link) => (
          <NavItem key={link.name} route={link.route} icon={link.icon}>
            {link.name}
          </NavItem>
        ))}
        <Text fontSize={"sm"} fontWeight={"bold"}>
          Perfil
        </Text>
        <Text fontSize="sm">{customer?.username}</Text>
        {storeUrl && (
          <Button
            as="a"
            href={storeUrl}
            target="_blank"
            rel="noreferrer"
            leftIcon={<FiExternalLink />}
            size="sm"
            variant="outline"
            borderColor="whiteAlpha.500"
            color="white"
            _hover={{ bg: "whiteAlpha.200" }}
            justifyContent="flex-start"
          >
            Ver loja
          </Button>
        )}
        <NavItem onClick={logOut} icon={FiLogOut}>
          Deslogar
        </NavItem>
      </Stack>
      <Stack> </Stack>
    </Stack>
  );
};

const NavItem = ({ icon, route, children, ...rest }) => {
  const content = (
    <Flex
      align="center"
      borderRadius="lg"
      role="group"
      cursor="pointer"
      {...rest}
    >
      {icon && (
        <Icon
          mr="3"
          fontSize="16"
          _groupHover={{
            color: "white",
          }}
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
      href={route}
      style={{ textDecoration: "none" }}
      _focus={{ boxShadow: "none" }}
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
      px={{ base: 4, md: 4 }}
      height="20"
      alignItems="center"
      display={isDesktop ? "none" : "flex"}
      justifyItems={"center"}
      backgroundColor={"#5f5482"}
      textColor={"white"}
      position={"fixed"}
      flex={"auto"}
      width={{ base: "full", md: "full" }}
      zIndex={"50"}
      borderBottomWidth="1px"
      borderBottomColor={"#5f5482"}
      justifyContent={{ base: "center", md: "center" }}
      {...rest}
    >
      <HStack zIndex={"50"} justifyContent={"center"} width={"full"}>
        <Flex
          display={"flex"}
          alignItems={"center"}
          zIndex={"50"}
          justifyContent={"end"}
          width={"full"}
        >
          <Menu
            zIndex={"50"}
            width={"full"}
            alignItems={"center"}
            justifyContent={"end"}
          >
            <Flex
              justifyContent={"start"}
              gap={4}
              alignSelf={"center"}
              rounded={"md"}
              backgroundColor={"#5F5482"}
              textColor={"white"}
              w={{ base: "full", md: "full" }}
              h="35px"
            >
              <Image
                src="/icon_sem_fundo.png"
                alt="Logo"
                boxSize="35px"
                objectFit="contain"
                alignSelf="center"
              />
              <Text alignSelf={"center"}>Mostra Digital</Text>
            </Flex>
            <IconButton
              display={isDesktop ? "none" : "flex"}
              onClick={onOpen}
              variant="outline"
              aria-label="open menu"
              icon={<FiMenu />}
            />
          </Menu>
        </Flex>
      </HStack>
    </Flex>
  );
};
