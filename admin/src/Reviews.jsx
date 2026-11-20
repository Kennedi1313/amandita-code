import { useEffect, useState } from "react";
import { Badge, Box, Button, HStack, SimpleGrid, Spinner, Stack, Text } from "@chakra-ui/react";
import { FiStar } from "react-icons/fi";
import SidebarWithHeader from "./components/shared/SideBar.jsx";
import PageHeader from "./components/shared/PageHeader.jsx";
import { getProductReviews, updateProductReviewStatus } from "./services/client.js";
import { errorNotification, successNotification } from "./services/notification.js";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const response = await getProductReviews();
      setReviews(response.data || []);
    } catch (error) {
      errorNotification("Erro", error.response?.data?.message || "Não foi possível carregar as avaliações.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (review) => {
    const status = review.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED";
    try {
      await updateProductReviewStatus(review.id, status);
      setReviews((current) => current.map((item) => item.id === review.id ? { ...item, status } : item));
      successNotification("Avaliação atualizada", status === "HIDDEN" ? "Ela foi ocultada da loja." : "Ela voltou a aparecer na loja.");
    } catch (error) {
      errorNotification("Erro", error.response?.data?.message || "Não foi possível atualizar a avaliação.");
    }
  };

  return (
    <SidebarWithHeader>
      <Box maxW="7xl" mx="auto" py={{ base: 3, md: 8 }}>
        <PageHeader title="Avaliações" description="Opiniões de clientes que receberam os produtos da sua loja." />
        {loading ? <Spinner mt={8} color="#1f633c" /> : reviews.length === 0 ? (
          <Box mt={6} rounded="lg" border="1px solid" borderColor="gray.100" bg="white" p={8} textAlign="center">
            <FiStar size={28} style={{ margin: "0 auto" }} />
            <Text mt={3} fontWeight="semibold">Ainda não há avaliações</Text>
            <Text mt={1} color="gray.500" fontSize="sm">Clientes poderão avaliar os produtos depois que os pedidos forem entregues.</Text>
          </Box>
        ) : (
          <SimpleGrid mt={6} columns={{ base: 1, xl: 2 }} spacing={3}>
            {reviews.map((review) => (
              <Box key={review.id} rounded="lg" border="1px solid" borderColor="gray.100" bg="white" p={5}>
                <HStack justify="space-between" align="start">
                  <Stack spacing={1}>
                    <Text fontWeight="bold">{review.productName}</Text>
                    <Text fontSize="sm" color="gray.600">{review.reviewerName} · Pedido #{review.saleItemId}</Text>
                  </Stack>
                  <Badge colorScheme={review.status === "PUBLISHED" ? "green" : "gray"}>
                    {review.status === "PUBLISHED" ? "Publicada" : "Oculta"}
                  </Badge>
                </HStack>
                <Text mt={3} color="yellow.600" aria-label={`${review.rating} de 5 estrelas`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</Text>
                {review.title && <Text mt={2} fontWeight="semibold">{review.title}</Text>}
                {review.comment && <Text mt={1} whiteSpace="pre-wrap" color="gray.700">{review.comment}</Text>}
                <Button mt={4} size="sm" variant="outline" onClick={() => toggleStatus(review)}>
                  {review.status === "PUBLISHED" ? "Ocultar avaliação" : "Publicar avaliação"}
                </Button>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Box>
    </SidebarWithHeader>
  );
}
