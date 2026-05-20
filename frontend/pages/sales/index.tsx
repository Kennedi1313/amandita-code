import React, { useEffect, useState } from "react";
import { getSalesByCustomerEmail } from "@/lib/client";
import { BsSearch, BsX } from "react-icons/bs";
import { useAuth } from "@/components/Context/authContext";
import ProtectedRoute from "../protectedRoute";
import { formatDate, formatSimpleCurrency } from "@/lib/utils";

const Sales = () => {
  const { customer } = useAuth();
  const [sales, setSales] = useState([] as any[]);
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);

  const fetchSales = async () => {
    try {
      const response = await getSalesByCustomerEmail(customer.username);
      let saleList = response.data.content;
      setSales(saleList);
    } catch (err) {
    } finally {
    }
  };

  const toggleAccordion = (saleId: number) => {
    setExpandedSaleId(expandedSaleId === saleId ? null : saleId);
  };

  useEffect(() => {
    fetchSales();
  }, []);

  return (
    <div className="md:container xl:max-w-screen-xl mx-auto py-12 p-2 md:px-6 mt-28 min-h-[40vh]">
      <h2 className="text-4xl font-semibold">Suas Compras</h2>
      <p className="mt-1 text-xl">{sales.length} pedidos no histórico</p>
      <table className="table-auto gap-2 md:py-5 my-2 w-full bg-white rounded-2xl px-4 py-6">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2">Data</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <React.Fragment key={sale.id}>
              <tr className="text-center">
                <td className="px-4 py-2">{formatDate(sale.saleDate)}</td>
                <td className="px-4 py-2">{sale.status}</td>
                <td className="px-4 py-2 flex justify-center">
                  <button
                    className="flex items-center bg-gray-200 text-black px-2 py-2 rounded-md w-28 justify-center"
                    onClick={() => toggleAccordion(sale.id)}
                  >
                    {expandedSaleId === sale.id ? (
                      <>
                        <BsX className="mr-1 text-2xl" />
                        Fechar
                      </>
                    ) : (
                      <>
                        <BsSearch className="mr-1" /> Detalhes
                      </>
                    )}
                  </button>
                </td>
              </tr>
              {expandedSaleId === sale.id && (
                <tr>
                  <td colSpan={5} className="bg-gray-50">
                    <div className="flex flex-col gap-4 p-4 overflow-scroll md:overflow-hidden max-w-sm md:max-w-full">
                      <p>
                        <strong>Cliente:</strong>{" "}
                        {sale.customer?.name || "Sem Cliente"}
                      </p>
                      <p>
                        <strong>Entrega:</strong>{" "}
                        {sale.shipment ? "Frete" : "Retirada"}
                      </p>
                      <p>
                        <strong>Valor total:</strong>
                        {formatSimpleCurrency(sale.totalPrice)}
                      </p>
                      <p>
                        <strong>Itens:</strong>
                      </p>
                      <table className="table-auto min-w-max border-collapse">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2">Produto</th>
                            <th className="px-4 py-2">Nome</th>
                            <th className="px-4 py-2">Quantidade</th>
                            <th className="px-4 py-2">Preço</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sale.saleItems?.map((item: any, index: number) => (
                            <tr key={index} className="text-center">
                              <td className="py-2 min-w-36 h-36">
                                <img
                                  className="w-36 h-36 object-cover"
                                  src={`https://d26zivezixyii1.cloudfront.net/profile-images/${item.product.id}/${item.product.profileImageId}.jpg`}
                                  alt={item.product.name}
                                />
                              </td>
                              <td className="px-4 py-2">{item.product.name}</td>
                              <td className="px-4 py-2">{item.quantity}</td>
                              <td className="px-4 py-2">
                                <span className="flex flex-col">
                                  {item.price != item.product.price ? (
                                    <span className="line-through text-red-600">
                                      {formatSimpleCurrency(item.product.price)}
                                    </span>
                                  ) : (
                                    ""
                                  )}
                                  {formatSimpleCurrency(item.price)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProtectedRoute(Sales);
