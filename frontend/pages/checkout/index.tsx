import { useEffect, useState } from "react";
import { createPreference, getCustomerByEmail } from "@/lib/client";
import { toast } from "react-hot-toast";
import { useShoppingCart } from "@/hooks/use-shopping-cart";
import ProtectedRoute from "../protectedRoute";
import { useAuth } from "@/components/Context/authContext";
import Link from "next/link";
import { Customer } from "@/types/CustomerTypes";
import { useRouter } from "next/router";
import { FiChevronRight, FiX } from "react-icons/fi";
import { Product } from "@/types/ProductTypes";
import ProductPrice from "@/components/productPrice";
import TotalPrice from "@/components/TotalPrice";

const Checkout = () => {
  const { cartDetails } = useShoppingCart();
  const [hasMounted, setHasMounted] = useState(false);
  const { customer } = useAuth();
  const [frete, setFrete] = useState(0);
  const [loading, setLoading] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [discountPrice, setDiscountPrice] = useState(0);
  const router = useRouter();
  const [fullCustomer, setFullCustomer] = useState<Customer>({
    id: 0,
    name: "",
    email: "",
    password: "",
    phone: "",
    cpf: "",
    addresses: [
      { zip: "", street: "", number: 0, district: "", city: "", reference: "" },
    ],
  });
  const fetchCustomers = () => {
    setLoading(true);
    getCustomerByEmail(customer.username)
      .then((res) => {
        setFullCustomer(res.data);
      })
      .catch((err) => {
        toast(err.code, err.response.data.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const fetchProducts = () => {
    const { total, fullPrice } = Object.entries(cartDetails).reduce(
      (acc, [_, product]) => {
        const itemFullPrice =
          parseFloat(product.price.replace(".", "").replace(",", "")) *
          product.quantity;
        const itemDiscountedPrice = itemFullPrice * (1 - product.promo / 100);

        acc.total += itemDiscountedPrice;
        acc.fullPrice += itemFullPrice;

        return acc;
      },
      { total: 0, fullPrice: 0 },
    );

    setTotalPrice(fullPrice);
    setDiscountPrice(total);
  };

  useEffect(() => {
    setHasMounted(true);
    fetchProducts();
    fetchCustomers();
  }, []);

  if (!hasMounted) {
    return null;
  }

  const handleFinalizeSale = async () => {
    setLoading(true);
    try {
      const paymentDetails = {
        amount: discountPrice,
        shippingFee: frete,
      };
      localStorage.setItem("paymentDetails", JSON.stringify(paymentDetails));
      router.push("/payment");
    } catch (error: any) {
      toast.error("Erro ao finalizar venda: " + error.response.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="md:container xl:max-w-screen-xl mx-auto py-12 p-2 md:px-6 mt-28 min-h-[40vh]">
      <h2 className="text-4xl font-semibold">Revise seu pedido</h2>
      <p className="mt-1 text-xl">Resumo do pedido</p>
      <div className="mx-auto flex flex-col gap-2 md:py-5 my-2 w-full bg-white rounded-2xl px-4 py-6">
        <p className="">Produtos</p>
        <table className="table-auto min-w-max w-full border-collapse overflow-scroll">
          {Object.entries(cartDetails).map(([key, product]: [any, any]) => (
            <tbody key={key} className="">
              <tr>
                <td className=" ">
                  {key}. {product.name}
                </td>
              </tr>
              <tr className="w-fit flex items-start gap-4 py-2">
                <td className="px-4">{product.quantity}</td>
                <td className="">
                  <FiX></FiX>
                </td>
                <td className="px-4">
                  <ProductPrice
                    price={product.price}
                    promo={product.promo}
                  ></ProductPrice>
                </td>
              </tr>
            </tbody>
          ))}
        </table>
      </div>
      <div className="mx-auto flex flex-col md:flex-row gap-2 py-2">
        <div className="mx-auto flex flex-col gap-2 md:py-5 my-2 w-full bg-white rounded-2xl px-4 py-6">
          <p className="">
            Informações de contato{" "}
            <Link
              href={"account"}
              className="opacity-50 hover:opacity-100 text-base"
            >
              {" "}
              (alterar){" "}
            </Link>
          </p>
          <div className="pb-5 max-w-sm md:max-w-full overflow-scroll md:overflow-hidden">
            <p>
              <strong>Nome: </strong> {fullCustomer.name}
            </p>
            <p>
              <strong>Email: </strong> {fullCustomer.email}
            </p>
            <p>
              <strong>CPF: </strong> {fullCustomer.cpf}
            </p>
            <p>
              <strong>Celular (whatsapp): </strong> {fullCustomer.phone}
            </p>
          </div>
        </div>
        <div className="mx-auto flex flex-col gap-2 md:py-5 my-2 w-full bg-white rounded-2xl px-4 py-6">
          <p className="">
            Endereço de entrega{" "}
            <Link
              href={"account"}
              className="opacity-50 hover:opacity-100 text-base"
            >
              {" "}
              (alterar){" "}
            </Link>
          </p>
          {fullCustomer?.addresses[0] ? (
            <div className="max-w-sm md:max-w-full overflow-scroll md:overflow-hidden">
              <p>
                <strong>CEP: </strong> {fullCustomer?.addresses[0].zip}
              </p>
              <p>
                <strong>Endereço: </strong> {fullCustomer?.addresses[0].street},{" "}
                {fullCustomer?.addresses[0].number} -{" "}
                {fullCustomer?.addresses[0].district},{" "}
                {fullCustomer?.addresses[0].city}
              </p>
              <p>
                <strong>Ponto de referência: </strong>
                {fullCustomer?.addresses[0].reference}
              </p>
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>
      <div className="mx-auto flex flex-col gap-2 md:py-5 my-2 w-full bg-white rounded-2xl px-4 py-6">
        <div className="">
          <div className="flex flex-col justify-between items-start gap-2 w-full">
            <div className="flex flex-col gap-2 justify-center items-start">
              <h1 className="">Forma de envio</h1>
              <div className="">
                <label className="flex gap-2 flex-row">
                  <input
                    type="radio"
                    name="retirada"
                    value={0}
                    onChange={() => setFrete(0)}
                    checked={frete == 0}
                  />
                  Retirada na loja (grátis)
                </label>
              </div>
              <div className="">
                <label className="flex flex-row gap-2">
                  <input
                    type="radio"
                    name="entrega"
                    value={800}
                    onChange={() => setFrete(800)}
                    checked={frete == 800}
                  />
                  Entrega local (taxa fixa) (R$ 8,00)
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xl flex flex-col gap-2 py-2">
          <p className="text-xl">Preço Total</p>
          <TotalPrice
            price={discountPrice + frete}
            fullPrice={totalPrice + frete}
          ></TotalPrice>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <Link
            href={"/cart"}
            className="w-full rounded-md px-5 py-3 md:mt-8 text-black-1000 font-bold text-center"
          >
            Voltar para o carrinho
          </Link>
          <button
            onClick={handleFinalizeSale}
            disabled={loading}
            className="text-white flex flex-row items-center justify-center gap-2 hover:gap-4 bg-black-1000 w-full self-end rounded-md px-5 py-3 md:mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Redirecionando..." : "Seguir para pagamento"}
            <FiChevronRight className="text-white text-lg"></FiChevronRight>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProtectedRoute(Checkout);
