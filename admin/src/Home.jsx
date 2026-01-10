import { useEffect, useState } from 'react';
import {
    Table, Thead, Tbody, Tr, Th, Td, TableContainer, Spinner, Box, Text,
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Button,
    Image,
    Grid,
    Flex,
    IconButton,
} from '@chakra-ui/react';
import SidebarWithHeader from "./components/shared/SideBar.jsx";
import axios from 'axios';
import { getSales, updateSale } from './services/product-client.js';
import { BsSearch } from 'react-icons/bs';
import { FiX } from 'react-icons/fi';

const SalesDashboard = () => {
const [sales, setSales] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

const formatCurrency = (amount = 0, currency = 'BRL') =>
    new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency,
        minimumIntegerDigits: 2,
    }).format(amount / 100);

// Helper function to format date
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return !isNaN(date) ? date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }) : 'Data inválida';
};

const fetchSales = async () => {
    try {
        const response = await getSales();
        setSales(response.data.content);
        setError(null);
    } catch (err) {
        console.log(err);
        setError('Error fetching sales data. Please try again.');
    } finally {
        setLoading(false);
    }
};

// Fetch sales data
useEffect(() => {
    fetchSales();
}, []);

function handleViewDetails(sale) {
    setSelectedSale(sale);
    onOpen();
}

const changeStatus = async (saleId, status) => {
    try {
        const response = await updateSale({saleId: saleId, status: status});
        setSelectedSale(response.data);
        fetchSales();
        setError(null);
    } catch (err) {
        setError('Error updating sales data. Please try again.');
    } finally {
        setLoading(false);
    }
}

const [selectedSale, setSelectedSale] = useState(null);
const { isOpen, onOpen, onClose } = useDisclosure();

return (
    <SidebarWithHeader>
        {loading ? (
        <Box textAlign="center" mt={10}>
            <Spinner size="xl" />
        </Box>
        ) : error ? (
        <Box textAlign="center" mt={10}>
            <Text color="red.500">{error}</Text>
        </Box>
        ) : (
        <TableContainer width={'full'} maxWidth={{ base: 'full', lg: 'container.lg' }} mx="auto">
            <Box  paddingTop={'24px'} paddingBottom={'8px'}>
                <Text fontWeight={'semibold'} fontSize={'4xl'}>Vendas</Text>
            </Box>
            <Table variant="simple">
            <Thead>
                <Tr>
                    <Th>Cliente</Th>
                    <Th>Detalhes</Th>
                </Tr>
            </Thead>
            <Tbody>
                {sales.map((sale) => (
                <Tr key={sale.id} textColor={'gray.800'}>
                    <Td w="100%"
                        whiteSpace="normal"
                        wordBreak="break-word"
                        gap={2}>
                            <Text fontWeight={'semibold'} fontSize={'sm'}>{sale.status}</Text>
                            <Text>{sale.customer != null ? sale.customer.name : "Sem Cliente"}</Text>
                    </Td>
                    <Td w="50px" textAlign={'end'}>
                        <IconButton 
                            colorScheme='blue'
                            icon={<BsSearch />}
                            onClick={() => handleViewDetails(sale)}
                        />
                    </Td>
                </Tr>
                ))}
            </Tbody>
            </Table>
        </TableContainer>
        )}

        <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
            <ModalHeader>Detalhes da Compra</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
            {selectedSale ? (
                <Box>
                <Text><strong>Status:</strong> {selectedSale.status}</Text>
                <Text><strong>Cliente:</strong> </Text>
                <Box pl={4}>
                    <Text>{selectedSale.customer?.name || "Sem Cliente"}</Text>
                    <Text>{selectedSale.customer?.cpf}</Text>
                    <Text>{selectedSale.customer?.email}</Text>
                    <Text>{selectedSale.customer?.phone}</Text>
                </Box>
                <Text><strong>Data:</strong> {formatDate(selectedSale.saleDate)}</Text>
                <Text><strong>Frete:</strong> {selectedSale.shipment ? "Entrega" : "Retirada"}</Text>
                <Text><strong>Endereço:</strong> </Text>
                <Box pl={4}>
                    { 
                        selectedSale.customer && selectedSale.customer.addresses[0] ? 
                        <Text>{selectedSale.customer?.addresses[0].street}, {selectedSale.customer?.addresses[0].number} - {selectedSale.customer?.addresses[0].district}, {selectedSale.customer?.addresses[0].city}/RN, {selectedSale.customer?.addresses[0].zip}</Text>
                        : 'Sem Endereço'
                    }
                </Box>
                <Text><strong>Valor Total:</strong> </Text>
                <Box pl={4}>
                    <Text>{formatCurrency(selectedSale.totalPrice)}</Text>
                </Box>
                <Text><strong>Itens:</strong></Text>
                <TableContainer mt={4} overflow={'hidden'}>
                    <Table variant="simple" style={{borderCollapse:"separate", borderSpacing:"0 1em"}}>
                    <Thead backgroundColor={'gray.100'}>
                        {selectedSale.items.length > 0 && 
                        (<Tr>
                            <Th>Item</Th>
                            <Th>Descrição</Th>
                        </Tr>)}
                    </Thead>
                    <Tbody>
                        {selectedSale.items.length === 0 && (
                            <Tr>
                                <Td colSpan={2} w="150px"
                                    whiteSpace="normal"
                                    wordBreak="break-word">
                                        Desculpe o transtorno, os produtos dessa compra foram excluídos do catalogo da loja.</Td>
                            </Tr>
                        )}
                        {selectedSale.items?.map((item, index) => (
                        <Tr key={index} textColor={'gray.800'}>
                            <Td 
                                padding={0}
                                w={'150px'}
                                h={'150px'}
                                minW={'150px'}>
                                <Image 
                                    w={'150px'}
                                    h={'150px'}
                                    objectFit={'cover'}
                                    src={`https://d26zivezixyii1.cloudfront.net/profile-images/${item.product.id}/${item.product.profileImageId}.jpg`}>
                                </Image>
                            </Td>
                            <Td gap={2}>
                                <Text 
                                    w="150px"
                                    whiteSpace="normal"
                                    wordBreak="break-word"
                                >
                                    {item.product.name}
                                </Text>                                
                                <Flex gap={2} alignItems={'center'}>
                                    <Text>{item.quantity}</Text>
                                    <FiX></FiX>
                                    {item.price != item.product.price  
                                        ? <Text textDecoration={'line-through'}
                                            textColor={'red'}>
                                            {item.product.price}
                                        </Text>
                                        : <Text></Text>}
                                    <Text>{formatCurrency(item.price)}</Text>
                                
                                </Flex>
                                
                            </Td>
                            
                        </Tr>
                        ))}
                    </Tbody>
                    </Table>
                </TableContainer>
                </Box>
            ) : (
                <Text>Nenhum detalhe disponível.</Text>
            )}
            </ModalBody>
            <ModalFooter gap={4}>
                <Button colorScheme="green" disabled={selectedSale && selectedSale.status != "APROVADO"} onClick={() => changeStatus(selectedSale.id, "PREPARANDO")}>Preparar Pedido</Button>
                <Button colorScheme="green" disabled={selectedSale && selectedSale.status != "PREPARANDO"} onClick={() => changeStatus(selectedSale.id, "ENTREGUE")}>Entregar Pedido</Button>
                <Button colorScheme="blue" onClick={onClose}>Fechar</Button>
            </ModalFooter>
        </ModalContent>
        </Modal>
    </SidebarWithHeader>
    );
};

export default SalesDashboard;
