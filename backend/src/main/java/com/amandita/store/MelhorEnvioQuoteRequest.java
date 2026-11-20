package com.amandita.store;

import com.amandita.Sale.SaleItemRequest;
import java.util.List;

public record MelhorEnvioQuoteRequest(String destinationZip, List<SaleItemRequest> items) {}
