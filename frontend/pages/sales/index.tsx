import React, { useEffect, useState } from "react";
import { getSalesByCustomerEmail } from "@/lib/client";
import { getProductImageUrl } from "@/lib/productClient";
import { useAuth } from "@/components/Context/authContext";
import ProtectedRoute from "../protectedRoute";
import { formatDate, formatSimpleCurrency } from "@/lib/utils";
import {
  FiChevronDown,
  FiChevronUp,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiPackage,
  FiShoppingBag,
  FiTruck,
  FiXCircle,
} from "react-icons/fi";
import Loading from "@/components/loading";
import Image from "next/image";

const Sales = () => {
  const { customer } = useAuth();
  const [sales, setSales] = useState([] as any[]);
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSales = async () => {
    if (!customer?.username) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await getSalesByCustomerEmail(customer.username);
      let saleList = response.data.content;
      setSales(saleList);
      setError("");
    } catch (err) {
      setError("Não foi possível carregar suas compras.");
    } finally {
      setLoading(false);
    }
  };

  const toggleAccordion = (saleId: number) => {
    setExpandedSaleId(expandedSaleId === saleId ? null : saleId);
  };

  useEffect(() => {
    fetchSales();
  }, [customer?.username]);

  const getStatusClassName = (status: string) => {
    const normalizedStatus = status?.toUpperCase();
    if (normalizedStatus === "APROVADO" || normalizedStatus === "ENTREGUE") {
      return "bg-green-100 text-green-800";
    }
    if (normalizedStatus === "RECUSADO" || normalizedStatus === "CANCELADO") {
      return "bg-red-100 text-red-800";
    }
    if (normalizedStatus === "PREPARANDO") {
      return "bg-blue-100 text-blue-800";
    }
    return "bg-yellow-100 text-yellow-800";
  };

  const getStatusLabel = (status: string) => {
    const normalizedStatus = status?.toUpperCase();
    if (normalizedStatus === "APROVADO") return "Pagamento aprovado";
    if (normalizedStatus === "PREPARANDO") return "Em preparo";
    if (normalizedStatus === "ENTREGUE") return "Entregue";
    if (normalizedStatus === "RECUSADO") return "Pagamento recusado";
    if (normalizedStatus === "CANCELADO") return "Cancelado";
    return "Aguardando pagamento";
  };

  const getNextStep = (status: string) => {
    const normalizedStatus = status?.toUpperCase();
    if (normalizedStatus === "APROVADO") {
      return "A loja recebeu o pagamento e vai preparar seu pedido.";
    }
    if (normalizedStatus === "PREPARANDO") {
      return "Seu pedido esta sendo separado pela loja.";
    }
    if (normalizedStatus === "ENTREGUE") {
      return "Pedido finalizado. Guarde essa compra no histórico.";
    }
    if (normalizedStatus === "RECUSADO" || normalizedStatus === "CANCELADO") {
      return "Esse pedido não vai seguir. Se precisar, refaça a compra.";
    }
    return "Finalize o pagamento no checkout para a loja confirmar o pedido.";
  };

  const getStatusIcon = (status: string) => {
    const normalizedStatus = status?.toUpperCase();
    if (normalizedStatus === "APROVADO") return FiCreditCard;
    if (normalizedStatus === "PREPARANDO") return FiPackage;
    if (normalizedStatus === "ENTREGUE") return FiCheckCircle;
    if (normalizedStatus === "RECUSADO" || normalizedStatus === "CANCELADO") {
      return FiXCircle;
    }
    return FiClock;
  };

  const parsePriceToCents = (value: any) => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (value === null || value === undefined) {
      return null;
    }

    const digits = String(value).replace(/\D/g, "");
    if (!digits) {
      return null;
    }

    const cents = Number(digits);
    return Number.isFinite(cents) ? cents : null;
  };

  const getItemsTotalCents = (saleItems: any[]) =>
    saleItems.reduce((total: number, item: any) => {
      const paidPrice = parsePriceToCents(item.price) || 0;
      return total + paidPrice * Number(item.quantity || 0);
    }, 0);

  const getSaleTotalCents = (sale: any, saleItems: any[]) => {
    const itemsTotal = getItemsTotalCents(saleItems);
    const rawTotal = Number(sale?.totalPrice || 0);

    if (itemsTotal > 0) {
      if (Math.abs(rawTotal - itemsTotal) < 0.01) {
        return itemsTotal;
      }

      if (Math.abs(rawTotal * 100 - itemsTotal) < 1) {
        return itemsTotal;
      }
    }

    if (!Number.isFinite(rawTotal)) {
      return itemsTotal;
    }

    return rawTotal % 1 !== 0 ? Math.round(rawTotal * 100) : rawTotal;
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="md:container xl:max-w-screen-xl mx-auto px-4 py-6 md:px-6 md:py-12 mt-16 md:mt-28 min-h-[40vh]">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-950">
            Histórico
          </h1>
          <p className="mt-2 text-base md:text-lg text-gray-600">
            {sales.length} {sales.length === 1 ? "pedido" : "pedidos"} no
            histórico
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-red-100 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {!error && sales.length === 0 && (
          <div className="bg-white rounded-md border border-gray-100 p-8 text-center flex flex-col items-center gap-3">
            <FiShoppingBag className="text-4xl text-gray-400" />
            <h3 className="text-xl font-semibold">Nenhuma compra ainda</h3>
            <p className="text-gray-600 max-w-md">
              Quando você finalizar um pedido, ele aparece aqui com status,
              itens e valor total.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {sales.map((sale) => {
            const isExpanded = expandedSaleId === sale.id;
            const saleItems = sale.items || sale.saleItems || [];
            const StatusIcon = getStatusIcon(sale.status);
            const itemCount =
              saleItems.reduce(
                (total: number, item: any) => total + Number(item.quantity || 0),
                0,
              ) || 0;
            const totalCents = getSaleTotalCents(sale, saleItems);

            return (
              <article
                key={sale.id}
                className="bg-white rounded-md border border-gray-100 overflow-hidden"
              >
                <button
                  className="w-full p-4 md:p-5 flex flex-col md:flex-row gap-4 md:items-center md:justify-between text-left"
                  onClick={() => toggleAccordion(sale.id)}
                >
                  <div className="flex gap-3 items-start">
                    <div className="h-11 w-11 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                      <StatusIcon className="text-xl" />
                    </div>
                    <div>
                      <p className="font-semibold">Pedido #{sale.id}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(sale.saleDate)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {itemCount} {itemCount === 1 ? "item" : "itens"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                        sale.status,
                      )}`}
                    >
                      {getStatusLabel(sale.status)}
                    </span>
                    <span className="font-semibold">
                      {formatSimpleCurrency(totalCents)}
                    </span>
                    {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 md:p-5 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      <div>
                        <p className="text-xs uppercase text-gray-500">
                          Cliente
                        </p>
                        <p className="font-medium">
                          {sale.customer?.name || "Sem cliente"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-gray-500">
                          Entrega
                        </p>
                        <p className="font-medium flex gap-2 items-center">
                          <FiTruck />
                          {sale.shipment ? "Frete" : "Retirada"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-gray-500">
                          Valor total
                        </p>
                        <p className="font-medium">
                          {formatSimpleCurrency(totalCents)}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 rounded-md border border-gray-100 bg-white p-3">
                      <p className="text-xs uppercase text-gray-500">
                        Próximo passo
                      </p>
                      <p className="mt-1 font-medium">
                        {getNextStep(sale.status)}
                      </p>
                      {sale.paymentMethod && (
                        <p className="mt-1 text-sm text-gray-500">
                          Pagamento: {sale.paymentMethod}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      {saleItems.map((item: any, index: number) => {
                        const paidPrice = parsePriceToCents(item.price);
                        const originalPrice = parsePriceToCents(
                          item.product?.price,
                        );
                        const showOriginalPrice =
                          paidPrice !== null &&
                          originalPrice !== null &&
                          originalPrice > paidPrice;

                        return (
                          <div
                            key={index}
                            className="bg-white rounded-md border border-gray-100 p-3 flex gap-3"
                          >
                            <Image
                              className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-md shrink-0"
                              src={getProductImageUrl(item.product.id)}
                              alt={item.product.name}
                              width={96}
                              height={96}
                              unoptimized
                              sizes="96px"
                              style={{ objectFit: "cover" }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">
                                {item.product.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                Quantidade: {item.quantity}
                              </p>
                              {item.variation && (
                                <p className="text-sm text-gray-500">
                                  Opção: {item.variation}
                                </p>
                              )}
                              <div className="text-sm mt-1 flex flex-col">
                                {showOriginalPrice && (
                                  <span className="line-through text-red-600">
                                    {formatSimpleCurrency(originalPrice)}
                                  </span>
                                )}
                                {paidPrice !== null && (
                                  <span className="font-semibold">
                                    {formatSimpleCurrency(paidPrice)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProtectedRoute(Sales);
