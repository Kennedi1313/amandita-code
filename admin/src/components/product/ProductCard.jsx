import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Flex,
  HStack,
  Image,
  Stack,
  Tag,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useRef } from "react";
import {
  deleteProduct,
  productsPictureUrl,
} from "../../services/product-client.js";
import {
  errorNotification,
  successNotification,
} from "../../services/notification.js";
import UpdateProductDrawer from "./UpdateProductDrawer.jsx";
import { FiEdit, FiPackage, FiTrash2 } from "react-icons/fi";

export default function CardWithImage({
  id,
  name,
  originalPrice,
  price,
  category,
  quantity,
  description,
  promo,
  variations,
  fetchProducts,
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();

  return (
    <Box
      w="full"
      bg="white"
      border="1px solid"
      borderColor="gray.100"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      transition="all 0.18s ease"
      _hover={{ boxShadow: "md", borderColor: "#d8c9ff" }}
    >
      <ImageSection
        id={id}
        category={category}
        quantity={quantity}
        promo={promo}
        variations={variations}
      />

      <Stack spacing={3} p={3} minH="170px">
        <ProductDetails
          name={name}
          price={price}
          variations={variations}
          quantity={quantity}
        />

        <Box flex="1" />

        <ActionButtons
          id={id}
          name={name}
          originalPrice={originalPrice}
          price={price}
          category={category}
          quantity={quantity}
          promo={promo}
          description={description}
          onOpen={onOpen}
          variations={variations}
          fetchProducts={fetchProducts}
          isOpen={isOpen}
          onClose={onClose}
          cancelRef={cancelRef}
        />
      </Stack>
    </Box>
  );
}

const ImageSection = ({ id, category, quantity, promo, variations }) => {
  const totalQuantity =
    variations && variations.length > 0
      ? variations.reduce((acc, variation) => acc + Number(variation.quantity || 0), 0)
      : Number(quantity || 0);

  return (
    <Box position="relative" bg="gray.50">
      <Image
        w="full"
        aspectRatio={1}
        maxH="210px"
        objectFit="cover"
        src={productsPictureUrl(id)}
        alt={`${id} image`}
      />

      <Tag
        position="absolute"
        top={2}
        left={2}
        bg="white"
        color="#5f5482"
        border="1px solid"
        borderColor="#ebe5fc"
        fontWeight="semibold"
        px={2}
        py={1}
        borderRadius="full"
        maxW="calc(100% - 72px)"
        noOfLines={1}
      >
        {category}
      </Tag>

      <Tag
        position="absolute"
        top={2}
        right={2}
        bg={totalQuantity > 0 ? "green.500" : "red.500"}
        color="white"
        fontWeight="bold"
        borderRadius="full"
        px={2.5}
        py={1}
      >
        <HStack spacing={1}>
          <FiPackage />
          <Text as="span">{totalQuantity}</Text>
        </HStack>
      </Tag>

      <HStack position="absolute" bottom={2} left={2} right={2} spacing={2}>
        {promo > 0 && (
          <Tag bg="red.500" color="white" fontWeight="bold" borderRadius="full">
            {promo}% OFF
          </Tag>
        )}

        {variations?.length > 0 && (
          <Tag
            bg="purple.600"
            color="white"
            fontWeight="semibold"
            borderRadius="full"
          >
            {variations.length} variações
          </Tag>
        )}
      </HStack>
    </Box>
  );
};

const ProductDetails = ({ name, price, variations, quantity }) => {
  const hasVariations = variations && variations.length > 0;
  const totalQuantity = hasVariations
    ? variations.reduce((acc, variation) => acc + Number(variation.quantity || 0), 0)
    : Number(quantity || 0);

  const variationPriceText = hasVariations
    ? (() => {
        const prices = variations
          .map((variation) =>
            parseFloat(String(variation.price || "").replace(".", "").replace(",", ".")),
          )
          .filter((variationPrice) => variationPrice > 0);
        if (prices.length === 0) return "0,00";

        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const format = (value) => value.toFixed(2).replace(".", ",");

        return `${format(min)} ~ ${format(max)}`;
      })()
    : null;

  return (
    <Stack spacing={2}>
      <Text
        fontSize="md"
        lineHeight="short"
        h="40px"
        noOfLines={2}
        fontWeight="semibold"
        color="gray.900"
        overflowWrap="anywhere"
        wordBreak="break-word"
        title={name}
      >
        {name}
      </Text>

      <Flex
        align={{ base: "flex-start", sm: "center" }}
        justify="space-between"
        gap={3}
        minH="34px"
      >
        <Text
          fontSize={{ base: "md", md: "md" }}
          fontWeight="bold"
          color="gray.900"
          lineHeight="short"
          whiteSpace="nowrap"
          noOfLines={1}
        >
          {hasVariations ? variationPriceText : price}
        </Text>
        <Tag
          size="sm"
          borderRadius="full"
          colorScheme={totalQuantity > 0 ? "green" : "red"}
          flexShrink={0}
        >
          {totalQuantity > 0 ? "Em estoque" : "Sem estoque"}
        </Tag>
      </Flex>
    </Stack>
  );
};

const ActionButtons = ({
  id,
  name,
  originalPrice,
  price,
  category,
  quantity,
  promo,
  description,
  onOpen,
  variations,
  fetchProducts,
  isOpen,
  onClose,
  cancelRef,
}) => (
  <>
    <Flex direction="row" justify="center" gap={2}>
      <UpdateProductDrawer
        buttonProps={{
          size: "sm",
          colorScheme: "purple",
          bg: "#5f5482",
          leftIcon: <FiEdit />,
          _hover: { bg: "#4f456e" },
        }}
        initialValues={{
          id,
          name,
          description,
          originalPrice,
          price,
          quantity,
          category,
          promo,
          variations,
        }}
        productId={id}
        fetchProducts={fetchProducts}
      />
      <Button
        size="sm"
        margin={0}
        colorScheme="red"
        variant="outline"
        rounded="md"
        width="full"
        _hover={{ bg: "red.50" }}
        onClick={onOpen}
        leftIcon={<FiTrash2 />}
      >
        Apagar
      </Button>
    </Flex>
    <DeleteAlertDialog
      isOpen={isOpen}
      onClose={onClose}
      cancelRef={cancelRef}
      name={name}
      id={id}
      fetchProducts={fetchProducts}
    />
  </>
);

const DeleteAlertDialog = ({
  isOpen,
  onClose,
  cancelRef,
  name,
  id,
  fetchProducts,
}) => (
  <AlertDialog
    isOpen={isOpen}
    leastDestructiveRef={cancelRef}
    onClose={onClose}
  >
    <AlertDialogOverlay>
      <AlertDialogContent>
        <AlertDialogHeader fontSize="lg" fontWeight="bold">
          Deletar Produto
        </AlertDialogHeader>
        <AlertDialogBody>
          Tem certeza que deseja deletar {name}? Essa ação não pode ser
          desfeita.
        </AlertDialogBody>
        <AlertDialogFooter>
          <Button ref={cancelRef} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            colorScheme="red"
            onClick={async () => {
              try {
                await deleteProduct(id);
                successNotification(
                  "Produto deletado",
                  `${name} foi deletado com sucesso.`,
                );
                try {
                  await fetchProducts();
                } catch (err) {
                  console.error(err);
                }
              } catch (err) {
                errorNotification(
                  err.code || "Erro",
                  err.response?.data?.message || "Falha ao deletar o produto",
                );
              } finally {
                onClose();
              }
            }}
            ml={3}
          >
            Deletar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialogOverlay>
  </AlertDialog>
);
