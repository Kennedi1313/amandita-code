import {
  Box,
  Button,
  Flex,
  Image,
  Stack,
  Text,
  useColorModeValue,
  Heading,
} from "@chakra-ui/react";
import { useShoppingFavorites } from "../../hooks/use-shopping-favorites.jsx";

export default function CardWithImageForSelling({
  id,
  name,
  description,
  price,
  category,
  stockQuantity,
  profileImageId,
  quantity,
  promo,
  withController,
  onClose,
  toast,
}) {
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

  const { favoritesDetails, addItemToFavorites, removeItem } =
    useShoppingFavorites();
  // Add item to cart function
  const addItemToCart = () => {
    addItemToFavorites({
      id: id.toString(),
      name,
      description,
      price,
      category,
      stockQuantity,
      profileImageId,
      promo,
    });
  };

  // Remove item from cart function
  const removeItemFromCart = () => {
    removeItem({
      id: id.toString(),
      name,
      description,
      price,
      category,
      stockQuantity,
      profileImageId,
      promo,
    });
  };

  return (
    <Flex width="full" my={2} py={2}>
      <Box
        width="full"
        bg={useColorModeValue("white", "gray.800")}
        display={"flex"}
        flexDirection={"row"}
      >
        {/* Product Image */}
        <Stack justify="center" align="center" width="100px" ml={5} p={1}>
          <Image
            w="100px"
            h="100px"
            minWidth={"100px"}
            objectFit="cover"
            src={`https://amandita-products-uploads.s3.sa-east-1.amazonaws.com/profile-images/${id}/${profileImageId}.jpg`}
            alt={name}
            rounded="md"
          />
        </Stack>

        {/* Product Info */}
        <Box
          p={4}
          width="full"
          display={"flex"}
          gap={4}
          flexDirection={"column"}
          h={"full"}
          justifyContent={"space-between"}
        >
          {/* Quantity Controller */}
          <Flex align="center" justify="flex-end" gap={5}>
            <Flex justify="space-between" align="center" width="full">
              <Heading fontSize="lg" fontWeight="semibold" noOfLines={1}>
                {name}
              </Heading>
            </Flex>
            {/* Product Price */}
            <Flex>
              {promo > 0 ? (
                <Flex flexDirection={"column"}>
                  <Text textDecoration={"line-through"} color={"red.600"}>
                    {formatCurrency(price)}
                  </Text>
                  <Text fontSize={"xl"}>{formatCurrency(price, promo)}</Text>
                </Flex>
              ) : (
                <span>
                  <Text fontSize={"xl"}>{formatCurrency(price, promo)}</Text>
                </span>
              )}
            </Flex>
          </Flex>
          <Stack
            direction="row"
            align="center"
            w={"fit-content"}
            spacing={0}
            border="1px solid"
            borderColor={"gray.300"}
            rounded={"md"}
          >
            {withController ? (
              <>
                <Button
                  rounded={0}
                  roundedLeft={"md"}
                  color={"gray.600"}
                  backgroundColor={"white"}
                  borderRight="1px solid"
                  borderColor={"gray.300"}
                  fontSize={26}
                  onClick={removeItemFromCart}
                  px={2}
                >
                  -
                </Button>
                <Text px={4}>{quantity}</Text>
                <Button
                  rounded={0}
                  roundedRight={"md"}
                  color={"gray.600"}
                  backgroundColor={"white"}
                  borderLeft="1px solid"
                  borderColor={"gray.300"}
                  fontSize={26}
                  onClick={addItemToCart}
                  px={2}
                  disabled={quantity >= stockQuantity}
                >
                  +
                </Button>
              </>
            ) : (
              <Button
                colorScheme="green"
                onClick={() => {
                  addItemToCart();
                  toast({
                    title: "Produto adicionado!",
                    description: `${name} foi adicionado ao carrinho.`,
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                  });
                  onClose();
                }}
                disabled={quantity >= stockQuantity}
              >
                Adicionar ao carrinho
              </Button>
            )}
          </Stack>
        </Box>
      </Box>
    </Flex>
  );
}
