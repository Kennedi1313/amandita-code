import {
    AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay,
    Box, Button, Center, Flex, Heading, Image, Stack, Tag, Text, useColorModeValue, useDisclosure
} from '@chakra-ui/react';
import { MdDelete, MdAddShoppingCart } from 'react-icons/md'; 
import { useRef } from 'react';
import { productsPictureUrl, deleteProduct } from "../../services/product-client.js";
import { errorNotification, successNotification } from "../../services/notification.js";
import UpdateProductDrawer from "./UpdateProductDrawer.jsx";
import { useShoppingFavorites } from "../../hooks/use-shopping-favorites.jsx";
import { FiDelete, FiEdit, FiX } from 'react-icons/fi';

export default function CardWithImage({ id, name, originalPrice, price, category, quantity, description, profileImageId, promo, variations, fetchProducts }) {
    const { isOpen, onOpen, onClose } = useDisclosure()
    const { favoritesCount, addItemToFavorites, favoritesDetails, removeItem } = useShoppingFavorites()
    const cancelRef = useRef()

    const formatCurrency = (amount = 0,  promo = 0, parcelas = 1,  currency = 'BRL') => {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency,
          minimumIntegerDigits: 2,
        }).format(((promo > 0 ? amount * (1-(promo/100)) : amount) / 100) / parcelas)}

    const addItemToCart = () => {
        addItemToFavorites({ id: id.toString(), name, description, price, category, stockQuantity: quantity, profileImageId, promo })
    }

    const removeItemFromCart = () => {
        removeItem({ id: id.toString(), name, description, price, category, stockQuantity: quantity, profileImageId, promo })
    }

    return (
        <Center py={4} w={'full'}>
            <Stack
                minW={{ base: 'full', md: '250px' }}
                w={'full'}
                maxW={{ base: 'full', md: '250px' }}
                h={'400px'}
                margin={0}
                justifyContent={'space-between'}>
                
                <ImageSection 
                    id={id} 
                    profileImageId={profileImageId} 
                    category={category}
                    quantity={quantity}
                    promo={promo}
                    variations={variations}/>
                <ProductDetails
                    name={name}
                    price={price}
                    description={description}
                    variations={variations}
                />
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
                    removeItemFromCart={removeItemFromCart}
                    fetchProducts={fetchProducts}
                    favoritesDetails={favoritesDetails}
                    isOpen={isOpen}
                    onClose={onClose}
                    cancelRef={cancelRef}
                    formatCurrency={formatCurrency}
                />
            </Stack>
        </Center>
    );
}

const ImageSection = ({ id, profileImageId, category, quantity, promo, variations }) => {
    const totalQuantity = variations && variations.length > 0
        ? variations.reduce((acc, v) => acc + Number(v.quantity || 0), 0)
        : Number(quantity);

    return (
        <Box position="relative">
            <Flex justify={'center'}>
                <Image
                    w={'full'}
                    h={'238px'}
                    objectFit={'cover'}
                    src={`https://d26zivezixyii1.cloudfront.net/profile-images/${id}/${profileImageId}.jpg`}
                    alt={`${id} image`}
                />
            </Flex>

            <Tag
                position="absolute"
                top={"6px"}
                left={2}
                bg="#5f5482"
                color="white"
                fontWeight="bold"
                px={2}
                py={1}
            >
                {category}
            </Tag>

            {promo > 0 && (
                <Tag
                    position="absolute"
                    top={"36px"}
                    left={2}
                    bg="#5f5482"
                    color="white"
                    fontWeight="bold"
                    px={2}
                    py={1}
                >
                    {promo}% OFF
                </Tag>
            )}

            {variations.length > 0 && (
                <Tag
                    position="absolute"
                    top={'66px'}
                    left={2}
                    bg="#5f5482"
                    color="white"
                    fontWeight="bold"
                    px={2}
                    py={1}
                >
                    {variations.length} variações
                </Tag>
            )}

            <Tag
                position="absolute"
                top={2}
                right={2}
                bg={totalQuantity > 0 ? 'green.400' : 'red.400'}
                color="white"
                fontWeight="bold"
                borderRadius="full"
                px={3}
            >
                {totalQuantity}
            </Tag>
        </Box>
    );
};

const ProductDetails = ({ name, price, variations }) => {

    const hasVariations = variations && variations.length > 0;

    const variationPriceText = hasVariations
        ? (() => {
            const prices = variations.map(v =>
                parseFloat(v.price.replace('.', '').replace(',', '.'))
            ).filter(p => p > 0);

            const min = Math.min(...prices);
            const max = Math.max(...prices);

            const format = (n) => n.toFixed(2).replace('.', ',');

            return `${format(min)} ~ ${format(max)}`;
        })()
        : null;

    return (
        <Box py={2} height={"full"} style={{ marginTop: 0 }}>
            <Stack spacing={2} align={"center"} justifyContent={"space-between"} height={"full"}>
                <Text fontSize={"lg"} height={"3.3rem"} overflow={"hidden"} width={"full"} fontWeight={500}>
                    {name}
                </Text>

                <Box display="flex" flexDirection="column" width={"full"}>
                    <Text fontSize="xl" fontWeight="semibold" color="gray.800">
                        {hasVariations ? variationPriceText : price}
                    </Text>
                </Box>
            </Stack>
        </Box>
    );
};

const ActionButtons = ({ id, name, originalPrice, price, category, quantity, promo, description, onOpen, variations, removeItemFromCart, fetchProducts, favoritesDetails, isOpen, onClose, cancelRef, formatCurrency }) => (
    <>
        <Flex direction={'row'} justify={'center'} gap={1} style={{marginTop: 0}} >
            <UpdateProductDrawer
                p={1}
                w={'full'}
                initialValues={{
                    id,
                    name,
                    description,
                    originalPrice,
                    price,
                    quantity,
                    category,
                    promo,
                    variations
                }}
                productId={id}
                fetchProducts={fetchProducts}
            />
            <Button
                margin={0}
                colorScheme="red"
                rounded={'md'}
                width={'full'}
                _hover={{
                    transform: 'translateY(-2px)',
                    boxShadow: 'lg'
                }}
                onClick={onOpen}
                leftIcon={<FiX />} 
            >
                Apagar
            </Button>
        </Flex>
        <DeleteAlertDialog isOpen={isOpen} onClose={onClose} cancelRef={cancelRef} name={name} id={id} fetchProducts={fetchProducts} />
    </>
);

const DeleteAlertDialog = ({ isOpen, onClose, cancelRef, name, id, fetchProducts }) => (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
            <AlertDialogContent>
                <AlertDialogHeader fontSize='lg' fontWeight='bold'>Deletar Produto</AlertDialogHeader>
                <AlertDialogBody>Tem certeza que deseja deletar {name}? Essa ação não pode ser desfeita.</AlertDialogBody>
                <AlertDialogFooter>
                    <Button ref={cancelRef} onClick={onClose}>Cancelar</Button>
                    <Button colorScheme='red' onClick={() => {
                        deleteProduct(id).then(() => {
                            successNotification('Produto deletado', `${name} foi deletado com sucesso.`);
                            fetchProducts();
                        }).catch(err => {
                            errorNotification(err.code, err.response.data.message);
                        }).finally(onClose);
                    }} ml={3}>Deletar</Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialogOverlay>
    </AlertDialog>
);
