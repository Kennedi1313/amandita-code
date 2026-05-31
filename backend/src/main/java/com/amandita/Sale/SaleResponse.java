package com.amandita.Sale;

import com.amandita.customer.CustomerDTO;
import com.amandita.customer.CustomerDTOMapper;
import com.amandita.product.ProductDTO;
import com.amandita.product.ProductDTOMapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

public record SaleResponse(
        Long id,
        Double totalPrice,
        LocalDateTime saleDate,
        CustomerDTO customer,
        String paymentMethod,
        String preferenceId,
        String paymentId,
        String status,
        Boolean shipment,
        Long storeId,
        List<SaleItemDTO> items
) {

    public static SaleResponse fromEntity(Sale sale, ProductDTOMapper productMapper, CustomerDTOMapper customerMapper) {
        if (sale == null) return null;

        return new SaleResponse(
                sale.getId(),
                sale.getTotalPrice(),
                sale.getSaleDate(),
                customerMapper.apply(sale.getCustomer()),
                sale.getPaymentMethod(),
                sale.getPreferenceId(),
                sale.getPaymentId(),
                sale.getStatus(),
                sale.getShipment(),
                sale.getStore() != null ? sale.getStore().getId() : null,

                sale.getSaleItems() != null
                        ? sale.getSaleItems().stream()
                        .map((item) -> SaleItemDTO.fromEntity(item, productMapper))
                        .filter(Objects::nonNull)
                        .toList()
                        : List.of()
        );
    }

    private record SaleItemDTO(
            Long id,
            ProductDTO product,
            Integer quantity,
            Integer price,
            String variation
    ) {

        private static SaleItemDTO fromEntity(SaleItem item, ProductDTOMapper mapper) {
            if (item == null || item.getProduct() == null) {
                return null;
            }

            return new SaleItemDTO(
                    item.getId(),
                    mapper.apply(item.getProduct()),
                    item.getQuantity(),
                    item.getPrice(),
                    item.getVariation() != null && item.getVariation().getOptions() != null
                            ? item.getVariation().getOptions().values().stream().findFirst().orElse(null)
                            : null
            );
        }
    }
}
