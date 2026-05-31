import { useEffect, useState } from "react";
import { createAsaasCheckout, getCustomerByEmail } from "@/lib/client";
import { toast } from "react-hot-toast";
import { useShoppingCart } from "@/hooks/use-shopping-cart";
import ProtectedRoute from "../protectedRoute";
import { useAuth } from "@/components/Context/authContext";
import Link from "next/link";
import { Customer } from "@/types/CustomerTypes";
import { FiAlertCircle, FiChevronRight, FiMinus, FiPlus, FiShoppingBag, FiX, FiXCircle } from "react-icons/fi";
import ProductPrice from "@/components/productPrice";
import TotalPrice from "@/components/TotalPrice";
import useStoreInfo from "@/hooks/use-store-info";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";
import { getProductImageUrl } from "@/lib/productClient";

const Checkout = () => {
  const { cartDetails, cartCount, addItemToCart, removeItem } =
    useShoppingCart();
  const [hasMounted, setHasMounted] = useState(false);
  const { customer } = useAuth();
  const storeInfo = useStoreInfo();
  const [frete, setFrete] = useState(0);
  const [shippingMethod, setShippingMethod] = useState("");
  const [shippingLabel, setShippingLabel] = useState("");
  const [shippingManuallySelected, setShippingManuallySelected] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [discountPrice, setDiscountPrice] = useState(0);
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
    if (!customer?.username) {
      return;
    }
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
    if (customer?.username) {
      fetchCustomers();
    }
  }, [customer?.username]);

  useEffect(() => {
    fetchProducts();
  }, [cartDetails]);

  const pickupEnabled = storeInfo?.pickupEnabled !== false;
  const localDeliveryEnabled = storeInfo?.localDeliveryEnabled !== false;
  const freeShippingMinAmount = storeInfo?.freeShippingMinAmount || 0;
  const localDeliveryFee = storeInfo?.localDeliveryFee || 0;
  const isFreeLocalDelivery =
    localDeliveryEnabled &&
    freeShippingMinAmount > 0 &&
    discountPrice >= freeShippingMinAmount;
  const localDeliveryFinalFee = isFreeLocalDelivery ? 0 : localDeliveryFee;
  const freeShippingRemaining = Math.max(
    freeShippingMinAmount - discountPrice,
    0,
  );
  const freeShippingProgress =
    freeShippingMinAmount > 0
      ? Math.min((discountPrice / freeShippingMinAmount) * 100, 100)
      : 0;
  const shouldShowFreeShippingProgress =
    localDeliveryEnabled && freeShippingMinAmount > 0;
  const shippingOptions = [
    pickupEnabled
      ? {
          method: "pickup",
          label: "Retirada na loja",
          description: "Retire seu pedido diretamente com a loja.",
          fee: 0,
        }
      : null,
    localDeliveryEnabled
      ? {
          method: "local_delivery",
          label: "Entrega local",
          description: storeInfo?.localDeliveryEta
            ? `Prazo: ${storeInfo.localDeliveryEta} dias úteis.`
            : "Entrega combinada pela loja.",
          fee: localDeliveryFinalFee,
        }
      : null,
  ].filter(Boolean) as {
    method: string;
    label: string;
    description: string;
    fee: number;
  }[];
  const selectedShippingOption =
    shippingOptions.find((option) => option.method === shippingMethod) ||
    shippingOptions[0];
  const requiresDeliveryAddress =
    selectedShippingOption?.method === "local_delivery";

  const hasText = (value?: string | null) => Boolean(value && value.trim());
  const address = fullCustomer.addresses?.[0];
  const missingCheckoutFields = [
    !hasText(fullCustomer.name) ? "nome" : null,
    !hasText(fullCustomer.email) ? "email" : null,
    !hasText(fullCustomer.cpf) ? "CPF" : null,
    !hasText(fullCustomer.phone) ? "telefone/WhatsApp" : null,
    requiresDeliveryAddress && (!address || !hasText(address.zip)) ? "CEP" : null,
    requiresDeliveryAddress && (!address || !hasText(address.street)) ? "rua" : null,
    requiresDeliveryAddress && (!address || !address.number) ? "numero" : null,
    requiresDeliveryAddress && (!address || !hasText(address.district)) ? "bairro" : null,
    requiresDeliveryAddress && (!address || !hasText(address.city)) ? "cidade" : null,
  ].filter(Boolean) as string[];
  const canAdvanceToPayment =
    cartCount > 0 && missingCheckoutFields.length === 0 && shippingOptions.length > 0;

  useEffect(() => {
    if (!hasMounted || !storeInfo || shippingOptions.length === 0) return;
    const currentOption = shippingOptions.find(
      (option) => option.method === shippingMethod,
    );
    const freeDeliveryOption = shippingOptions.find(
      (option) => option.method === "local_delivery",
    );
    const nextOption =
      !shippingManuallySelected && isFreeLocalDelivery && freeDeliveryOption
        ? freeDeliveryOption
        : currentOption || shippingOptions[0];
    setShippingMethod(nextOption.method);
    setShippingLabel(nextOption.label);
    setFrete(nextOption.fee);
  }, [
    hasMounted,
    storeInfo,
    shippingMethod,
    localDeliveryFinalFee,
    pickupEnabled,
    localDeliveryEnabled,
    isFreeLocalDelivery,
    shippingManuallySelected,
  ]);

  if (!hasMounted) {
    return null;
  }
  if (!storeInfo) return null;

  const handleFinalizeSale = async () => {
    if (!canAdvanceToPayment) {
      toast.error(
        shippingOptions.length === 0
          ? "A loja ainda não configurou formas de envio."
          : cartCount === 0
            ? "Seu carrinho esta vazio."
          : "Complete seus dados antes de seguir para o pagamento.",
      );
      return;
    }

    setLoading(true);
    try {
      const saleItemRequests = Object.entries(cartDetails).map(
        ([_, product]: [any, any]) => ({
          productId: Number(product.productId || product.id),
          variationId: product.variationId || null,
          quantity: product.quantity,
        }),
      );

      const response = await createAsaasCheckout({
        returnBaseUrl: window.location.origin,
        saleRequest: {
          saleItemRequests,
          customerEmail: fullCustomer.email,
          paymentMethod: "ASAAS",
          shippingFee: frete,
          shippingMethod,
        },
      });

      window.location.href = response.data.checkoutUrl;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        (typeof error.response?.data === "string" ? error.response.data : "") ||
        "Não foi possível iniciar o checkout Asaas.";
      toast.error(
        errorMessage,
      );
    } finally {
      setLoading(false);
    }
  };

  if (cartCount === 0) {
    return (
      <main className="md:container xl:max-w-screen-xl mx-auto px-4 py-6 md:px-6 md:py-12 mt-16 md:mt-28 min-h-[70vh]">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-950">
            Carrinho
          </h1>
          <p className="mt-2 text-base md:text-lg text-gray-600">
            Adicione produtos ao carrinho para revisar e finalizar sua compra.
          </p>
        </div>

        <section className="rounded-md border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-purple-50 text-purple-600">
            <FiShoppingBag className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-gray-950">
            Seu carrinho está vazio
          </h2>
          <p className="mx-auto mt-2 max-w-md text-gray-600">
            Escolha seus produtos favoritos e volte aqui para confirmar o pedido.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-black-1000 px-5 font-semibold text-white transition hover:opacity-90"
          >
            Ver produtos
          </Link>
        </section>
      </main>
    );
  }

  return (
    <div className="md:container xl:max-w-screen-xl mx-auto px-4 py-6 md:px-6 md:py-12 mt-16 md:mt-28 min-h-[40vh]">
      <h1 className="text-3xl md:text-4xl font-semibold text-gray-950">
        Carrinho
      </h1>
      <p className="mt-2 text-base md:text-lg text-gray-600">
        {cartCount > 0 ? `${cartCount} itens no pedido` : "Seu carrinho esta vazio"}
      </p>
      <div className="mx-auto flex flex-col gap-2 md:py-5 my-2 w-full bg-white rounded-2xl py-6">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">Produtos</p>
          <Link href="/" className="text-sm font-semibold text-black-1000 underline">
            Adicionar mais produtos
          </Link>
        </div>
        {cartCount > 0 ? (
          <div className="flex flex-col gap-4">
            {Object.entries(cartDetails).map(([key, product]: [any, any]) => {
              const stockQuantity = Number(product.stockQuantity || 0);
              const reachedStockLimit =
                stockQuantity > 0 && Number(product.quantity || 0) >= stockQuantity;
              return (
              <div
                key={key}
                className="flex flex-col gap-4 rounded-md border border-gray-100 p-3 md:flex-row md:items-center md:justify-between"
              >
                <Link href={`/details/${product.productId || product.id}`}>
                  <div className="flex items-center gap-4 group">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100">
                      <Image
                        src={getProductImageUrl(product.productId || product.id)}
                        alt={product.name}
                        fill
                        loading="lazy"
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                    <div>
                      <p className="font-semibold group-hover:underline">
                        {product.name}
                      </p>
                      {product.variationLabel && (
                        <p className="text-sm text-gray-500">
                          {product.variationLabel}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>

                <div className="flex items-center justify-between gap-4 md:justify-end">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => removeItem(product)}
                      disabled={product.quantity <= 1}
                      className="rounded-md p-1 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Reduzir quantidade"
                    >
                      <FiMinus className="h-5 w-5" />
                    </button>
                    <p className="min-w-6 text-center font-semibold">
                      {product.quantity}
                    </p>
                    <button
                      type="button"
                      onClick={() => addItemToCart(product, 1)}
                      disabled={reachedStockLimit}
                      className="rounded-md p-1 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Aumentar quantidade"
                    >
                      <FiPlus className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <FiX className="h-4 w-4 text-black-1000" />
                    <ProductPrice
                      price={product.price}
                      promo={product.promo}
                    ></ProductPrice>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(product, product.quantity)}
                    className="hover:text-rose-500"
                    aria-label="Remover produto"
                  >
                    <FiXCircle className="h-6 w-6 text-red-600" />
                  </button>
                </div>
              </div>
            )})}
          </div>
        ) : (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-yellow-900">
            <p className="font-semibold">Seu pedido ainda não tem produtos.</p>
            <Link
              href="/"
              className="mt-3 inline-flex rounded-md bg-black-1000 py-2 text-sm font-semibold text-white"
            >
              Escolher produtos
            </Link>
          </div>
        )}
      </div>
      <div className="mx-auto flex flex-col md:flex-row gap-2 py-2">
        <div className="mx-auto flex flex-col gap-2 md:py-5 my-2 w-full bg-white rounded-2xl py-6">
          <p className="">
            Informações de contato{" "}
            <Link
              href={"/account"}
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
              <strong>CPF: </strong> {fullCustomer.cpf || "Não informado"}
            </p>
            <p>
              <strong>Celular (whatsapp): </strong>{" "}
              {fullCustomer.phone || "Não informado"}
            </p>
          </div>
        </div>
        <div className="mx-auto flex flex-col gap-2 md:py-5 my-2 w-full bg-white rounded-2xl py-6">
          <p className="">
            Endereço de entrega{" "}
            <Link
              href={"/account"}
              className="opacity-50 hover:opacity-100 text-base"
            >
              {" "}
              (alterar){" "}
            </Link>
          </p>
          {address ? (
            <div className="max-w-sm md:max-w-full overflow-scroll md:overflow-hidden">
              <p>
                <strong>CEP: </strong> {address.zip || "Não informado"}
              </p>
              <p>
                <strong>Endereço: </strong> {address.street || "Não informado"},{" "}
                {address.number || "s/n"} -{" "}
                {address.district || "Não informado"},{" "}
                {address.city || "Não informado"}
              </p>
              <p>
                <strong>Ponto de referência: </strong>
                {address.reference || "Não informado"}
              </p>
            </div>
          ) : (
            <p className="text-gray-600">Nenhum endereço cadastrado.</p>
          )}
        </div>
      </div>
      <div className="mx-auto flex flex-col gap-2 md:py-5 my-2 w-full bg-white rounded-2xl py-6">
        {!canAdvanceToPayment && (
          <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-yellow-900">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="mt-1 text-xl shrink-0" />
              <div>
                <p className="font-semibold">
                  {shippingOptions.length === 0
                    ? "A loja ainda não configurou formas de envio"
                    : cartCount === 0
                      ? "Adicione produtos para seguir para o pagamento"
                    : "Complete seus dados para seguir para o pagamento"}
                </p>
                {cartCount === 0 ? (
                  <p className="mt-1 text-sm">
                    Escolha ao menos um produto antes de fechar o pedido.
                  </p>
                ) : shippingOptions.length === 0 ? (
                  <p className="mt-1 text-sm">
                    Tente novamente mais tarde ou fale com a loja.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-sm">
                      Falta informar: {missingCheckoutFields.join(", ")}.
                    </p>
                    <Link
                      href={"/account"}
                      className="mt-3 inline-flex rounded-md bg-black-1000 py-2 text-sm font-semibold text-white"
                    >
                      Completar cadastro
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="">
          <div className="flex flex-col justify-between items-start gap-2 w-full">
            <div className="flex flex-col gap-2 justify-center items-start">
              <h1 className="">Forma de envio</h1>
              {shippingOptions.length === 0 && (
                <p className="text-sm text-red-600">
                  Esta loja ainda não configurou formas de envio.
                </p>
              )}
              {shippingOptions.map((option) => (
                <label
                  key={option.method}
                  className="flex gap-3 rounded-md border border-gray-100 p-3 w-full cursor-pointer"
                >
                  <input
                    type="radio"
                    name="shipping"
                    value={option.method}
                    onChange={() => {
                      setShippingManuallySelected(true);
                      setShippingMethod(option.method);
                      setShippingLabel(option.label);
                      setFrete(option.fee);
                    }}
                    checked={selectedShippingOption?.method === option.method}
                  />
                  <span className="flex flex-col">
                    <strong>
                      {option.label} -{" "}
                      {option.fee > 0 ? formatCurrency(option.fee) : "Grátis"}
                    </strong>
                    <span className="text-sm text-gray-500">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
              {isFreeLocalDelivery && (
                <p className="text-sm text-green-700">
                  Frete grátis aplicado para compras acima de{" "}
                  {formatCurrency(freeShippingMinAmount)}.
                </p>
              )}
              {shouldShowFreeShippingProgress && (
                <div className="mt-2 w-full rounded-md border border-gray-100 bg-white p-3">
                  <div className="mb-2 flex flex-col gap-1 text-sm md:flex-row md:items-center md:justify-between">
                    <span className="font-semibold text-gray-800">
                      {isFreeLocalDelivery
                        ? "Você ganhou frete grátis na entrega local"
                        : `Faltam ${formatCurrency(
                            freeShippingRemaining,
                          )} para frete grátis`}
                    </span>
                    <span className="text-gray-500">
                      (Meta: {formatCurrency(freeShippingMinAmount)})
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-black-1000 transition-all"
                      style={{ width: `${freeShippingProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-xl flex flex-col gap-2 py-2">
          <p className="text-xl font-semibold">Resumo do pagamento</p>
          <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Produtos</span>
              <span>{formatCurrency(discountPrice)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>{shippingLabel || "Envio"}</span>
              <span>{frete > 0 ? formatCurrency(frete) : "Grátis"}</span>
            </div>
          </div>
          <TotalPrice
            price={discountPrice + frete}
            fullPrice={totalPrice + frete}
          ></TotalPrice>
          <p className="text-sm text-gray-500">
            Você será direcionado para uma página segura de pagamento. Depois,
            acompanhe o pedido em Minhas compras.
          </p>
        </div>

        <div className="sticky bottom-0 z-30 -mx-4 flex flex-col gap-2 border-t border-gray-100 bg-white px-4 py-3 md:static md:mx-0 md:flex-row md:border-t-0 md:px-0 md:py-0">
          <div className="flex items-center justify-between md:hidden">
            <span className="text-sm text-gray-500">Total</span>
            <strong>{formatCurrency(discountPrice + frete)}</strong>
          </div>
          <Link
            href={"/"}
            className="w-full rounded-md px-5 py-3 md:mt-8 text-black-1000 font-bold text-center"
          >
            Continuar comprando
          </Link>
          <button
            onClick={handleFinalizeSale}
            disabled={loading || !canAdvanceToPayment}
            className="text-white flex flex-row items-center justify-center gap-2 hover:gap-4 bg-black-1000 w-full self-end rounded-md px-5 py-3 md:mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Criando checkout..." : "Seguir para pagamento"}
            <FiChevronRight className="text-white text-lg"></FiChevronRight>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProtectedRoute(Checkout);
