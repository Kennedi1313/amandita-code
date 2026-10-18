import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createMercadoPagoCheckout, getCustomerByEmail, getLocalDeliveryQuote, getMelhorEnvioQuote } from "@/lib/client";
import { toast } from "react-hot-toast";
import { useShoppingCart } from "@/hooks/use-shopping-cart";
import { useAuth } from "@/components/Context/authContext";
import Link from "next/link";
import { Customer } from "@/types/CustomerTypes";
import { FiAlertCircle, FiChevronRight, FiMinus, FiPlus, FiShoppingBag, FiXCircle } from "react-icons/fi";
import ProductPrice from "@/components/productPrice";
import TotalPrice from "@/components/TotalPrice";
import useStoreInfo from "@/hooks/use-store-info";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";
import { getProductImageUrl } from "@/lib/productClient";
import { SiMercadopago } from "react-icons/si";

const Checkout = () => {
  const router = useRouter();
  const { cartDetails, cartCount, addItemToCart, removeItem } =
    useShoppingCart();
  const [hasMounted, setHasMounted] = useState(false);
  const { customer } = useAuth();
  const storeInfo = useStoreInfo();
  const [frete, setFrete] = useState(0);
  const [deliveryQuote, setDeliveryQuote] = useState<any>(null);
  const [melhorEnvioQuotes, setMelhorEnvioQuotes] = useState<any[]>([]);
  const [melhorEnvioQuoteLoading, setMelhorEnvioQuoteLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
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
  const localDeliveryEta = String(storeInfo?.localDeliveryEta || "").trim();
  const localDeliveryEtaLabel = /^\d+(?:[,.]\d+)?$/.test(localDeliveryEta)
    ? `${localDeliveryEta} dias úteis`
    : localDeliveryEta;
  const isFreeLocalDelivery = Boolean(deliveryQuote?.available && deliveryQuote.fee === 0 && freeShippingMinAmount > 0 && discountPrice >= freeShippingMinAmount);
  const freeShippingRemaining = Math.max(
    freeShippingMinAmount - discountPrice,
    0,
  );
  const freeShippingProgress =
    freeShippingMinAmount > 0
      ? Math.min((discountPrice / freeShippingMinAmount) * 100, 100)
      : 0;
  const pickupAddress = storeInfo?.pickupAddress;
  const pickupAddressConfigured = Boolean(
    pickupAddress?.zip?.trim() && pickupAddress?.street?.trim() &&
    pickupAddress?.number?.trim() && pickupAddress?.district?.trim() &&
    pickupAddress?.city?.trim(),
  );
  const pickupAddressLabel = pickupAddressConfigured
    ? `${pickupAddress?.street}, ${pickupAddress?.number} · ${pickupAddress?.district}, ${pickupAddress?.city} · CEP ${pickupAddress?.zip}`
    : "A loja ainda não informou o endereço de retirada.";
  const mercadoPagoConfigured = storeInfo?.mercadoPagoConfigured === true;
  const mercadoPagoCheckoutReady = mercadoPagoConfigured && Boolean(storeInfo?.mercadoPagoPublicKey);
  const paymentConfigured = mercadoPagoCheckoutReady;
  const isWhatsAppOnly = !paymentConfigured;
  const requiresCustomerLogin = paymentConfigured && !customer;
  const melhorEnvioOptions = storeInfo?.melhorEnvioConfigured && paymentConfigured
    ? melhorEnvioQuotes.map((quote) => ({
        method: `melhor_envio:${quote.id}`,
        label: quote.name || quote.company?.name || "Melhor Envio",
        description: quote.delivery_range
          ? `${quote.delivery_range.min} a ${quote.delivery_range.max} dias úteis.`
          : "Entrega calculada pelo Melhor Envio.",
        fee: Math.round(Number(String(quote.custom_price || quote.price || 0).replace(",", ".")) * 100),
      }))
    : [];

  const shippingOptions = [
    pickupEnabled && pickupAddressConfigured
      ? {
          method: "pickup",
          label: "Retirada na loja",
          description: "Retire seu pedido diretamente com a loja.",
          fee: 0,
          available: pickupAddressConfigured,
        }
      : null,
    paymentConfigured && localDeliveryEnabled && deliveryQuote?.available !== false
      ? {
          method: "local_delivery",
          label: "Entrega local",
          description: localDeliveryEtaLabel
            ? `Prazo: ${localDeliveryEtaLabel}.`
            : "Entrega combinada pela loja.",
          fee: deliveryQuote?.available ? deliveryQuote.fee : 0,
        }
      : null,
    ...melhorEnvioOptions,
  ].filter(Boolean) as {
    method: string;
    label: string;
    description: string;
    fee: number;
    available?: boolean;
  }[];
  const selectedShippingOption =
    shippingOptions.find((option) => option.method === shippingMethod) ||
    shippingOptions[0];
  const shouldShowFreeShippingProgress =
    localDeliveryEnabled &&
    selectedShippingOption?.method === "local_delivery" &&
    deliveryQuote?.available &&
    !quoteLoading &&
    freeShippingMinAmount > 0;
  const requiresDeliveryAddress =
    (selectedShippingOption?.method === "local_delivery" || selectedShippingOption?.method?.startsWith("melhor_envio:")) && !isWhatsAppOnly;

  const hasText = (value?: string | null) => Boolean(value && value.trim());
  const address = fullCustomer.addresses?.[0];
  useEffect(() => {
    if (!localDeliveryEnabled || !address?.zip || discountPrice <= 0) {
      setDeliveryQuote(null);
      setQuoteLoading(false);
      return;
    }
    let active = true;
    setDeliveryQuote(null);
    setQuoteLoading(true);
    getLocalDeliveryQuote(address.zip, Math.round(discountPrice))
      .then((response) => { if (active) setDeliveryQuote(response.data); })
      .catch((error) => {
        if (active) setDeliveryQuote({ available: false, message: error.response?.data?.message || "Não foi possível calcular a entrega para este CEP." });
      })
      .finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [localDeliveryEnabled, address?.zip, discountPrice, storeInfo?.domain]);
  useEffect(() => {
    if (!storeInfo?.melhorEnvioConfigured || !paymentConfigured || !address?.zip || discountPrice <= 0) {
      setMelhorEnvioQuotes([]);
      return;
    }
    const products = Object.values(cartDetails).map((product: any) => ({
      name: product.name,
      quantity: product.quantity,
      unitary_value: Number(String(product.price).replace(".", "").replace(",", ".")),
      weight: Number(product.weightKg || 0),
      width: Number(product.widthCm || 0),
      height: Number(product.heightCm || 0),
      length: Number(product.lengthCm || 0),
    }));
    if (products.some((product) => !product.weight || !product.width || !product.height || !product.length)) {
      setMelhorEnvioQuotes([]);
      return;
    }
    let active = true;
    setMelhorEnvioQuoteLoading(true);
    getMelhorEnvioQuote({
      from: { postal_code: storeInfo.shippingOriginZip?.replace(/\D/g, "") },
      to: { postal_code: address.zip.replace(/\D/g, "") },
      products,
      options: { insurance_value: discountPrice, receipt: false, own_hand: false, reverse: false },
    }).then((response) => {
      if (active) setMelhorEnvioQuotes(Array.isArray(response.data) ? response.data.filter((quote: any) => !quote.error) : []);
    }).catch(() => { if (active) setMelhorEnvioQuotes([]); }).finally(() => { if (active) setMelhorEnvioQuoteLoading(false); });
    return () => { active = false; };
  }, [storeInfo?.melhorEnvioConfigured, storeInfo?.shippingOriginZip, address?.zip, discountPrice, cartDetails, paymentConfigured]);
  useEffect(() => {
    if (shippingMethod === "local_delivery" && deliveryQuote?.available) setFrete(deliveryQuote.fee);
    else if (shippingMethod?.startsWith("melhor_envio:")) {
      setFrete(selectedShippingOption?.fee || 0);
    }
    else if (shippingMethod === "pickup" || shippingMethod === "local_delivery") setFrete(0);
  }, [shippingMethod, deliveryQuote, selectedShippingOption?.fee]);
  const missingCheckoutFields = [
    paymentConfigured && customer && !hasText(fullCustomer.name) ? "nome" : null,
    paymentConfigured && customer && !hasText(fullCustomer.email) ? "email" : null,
    paymentConfigured && customer && !hasText(fullCustomer.cpf) ? "CPF" : null,
    paymentConfigured && customer && !hasText(fullCustomer.phone) ? "telefone/WhatsApp" : null,
    requiresDeliveryAddress && (!address || !hasText(address.zip)) ? "CEP" : null,
    requiresDeliveryAddress && (!address || !hasText(address.street)) ? "rua" : null,
    requiresDeliveryAddress && (!address || !address.number) ? "numero" : null,
    requiresDeliveryAddress && (!address || !hasText(address.district)) ? "bairro" : null,
    requiresDeliveryAddress && (!address || !hasText(address.city)) ? "cidade" : null,
  ].filter(Boolean) as string[];
  const canFinalizeOrder =
    cartCount > 0 && !requiresCustomerLogin && missingCheckoutFields.length === 0 && shippingOptions.length > 0;
  const hasValidDeliveryQuote = isWhatsAppOnly || selectedShippingOption?.method !== "local_delivery" || (deliveryQuote?.available && !quoteLoading);
  const hasValidSelectedShipping = selectedShippingOption?.method !== "pickup" || pickupAddressConfigured;
  const canProceedWithSelectedShipping = canFinalizeOrder && hasValidDeliveryQuote && hasValidSelectedShipping;
  const selectedDeliveryBlocked =
    selectedShippingOption?.method === "local_delivery" && !hasValidDeliveryQuote;
  const shippingPriceLabel = selectedShippingOption?.method !== "local_delivery"
    ? selectedShippingOption?.method?.startsWith("melhor_envio:")
      ? formatCurrency(selectedShippingOption.fee)
      : "Grátis"
    : quoteLoading
      ? "Calculando…"
      : deliveryQuote?.available
        ? deliveryQuote.fee > 0 ? formatCurrency(deliveryQuote.fee) : "Grátis"
        : "Indisponível";
  const canPayOnline = canProceedWithSelectedShipping && paymentConfigured && Boolean(customer);
  const buildCheckoutRequest = useCallback(() => ({
    saleRequest: {
      saleItemRequests: Object.entries(cartDetails).map(
        ([_, product]: [any, any]) => ({
          productId: Number(product.productId || product.id),
          variationId: product.variationId || null,
          quantity: product.quantity,
        }),
      ),
      customerEmail: fullCustomer.email,
      paymentMethod: "MERCADO_PAGO",
      shippingFee: frete,
      shippingMethod,
      shippingZip: requiresDeliveryAddress ? address?.zip : null,
      shippingQuote: shippingMethod.startsWith("melhor_envio:")
        ? JSON.stringify(selectedShippingOption)
        : null,
    },
  }), [cartDetails, fullCustomer.email, frete, shippingMethod, address?.zip]);

  useEffect(() => {
    if (!hasMounted || !storeInfo || shippingOptions.length === 0) return;
    const currentOption = shippingOptions.find(
      (option) => option.method === shippingMethod,
    );
    const freeDeliveryOption = shippingOptions.find(
      (option) => option.method === "local_delivery",
    );
    const firstSelectableOption = shippingOptions.find(
      (option) => option.method !== "pickup" || pickupAddressConfigured,
    );
    const nextOption =
      !shippingManuallySelected && isFreeLocalDelivery && freeDeliveryOption
        ? freeDeliveryOption
        : (currentOption && (currentOption.method !== "pickup" || pickupAddressConfigured)
          ? currentOption
          : firstSelectableOption || shippingOptions[0]);
    setShippingMethod(nextOption.method);
    setShippingLabel(nextOption.label);
    setFrete(nextOption.fee);
  }, [
    hasMounted,
    storeInfo,
    shippingMethod,
    deliveryQuote,
    pickupEnabled,
    pickupAddressConfigured,
    localDeliveryEnabled,
    isFreeLocalDelivery,
    shippingManuallySelected,
  ]);

  if (!hasMounted) {
    return null;
  }
  if (!storeInfo) return null;
  const buildWhatsAppMessage = () => {
    const items = Object.values(cartDetails)
      .map((product: any) => {
        const variation = product.variationLabel ? ` (${product.variationLabel})` : "";
        return `- ${product.quantity}x ${product.name}${variation}`;
      })
      .join("\n");
    const addressText = selectedShippingOption?.method === "local_delivery" && address
      ? `\nEndereço: ${address.street}, ${address.number} - ${address.district}, ${address.city} - CEP ${address.zip}`
      : "";
    const pickupText = selectedShippingOption?.method === "pickup"
      ? `\nEndereço para retirada: ${pickupAddressLabel}${pickupAddress?.reference ? `\nReferência: ${pickupAddress.reference}` : ""}`
      : "";
    const deliveryCost = selectedShippingOption?.method === "local_delivery" && !deliveryQuote?.available
      ? "a confirmar com a loja"
      : frete > 0 ? formatCurrency(frete) : "Grátis";
    return `Olá! Gostaria de fazer este pedido:\n\n${items}\n\nEntrega: ${shippingLabel || "Retirada"} - ${deliveryCost}${addressText}${pickupText}\nTotal estimado: ${deliveryQuote?.available || selectedShippingOption?.method !== "local_delivery" ? formatCurrency(discountPrice + frete) : "a confirmar com a loja"}`;
  };

  const handleFinalizeSale = async () => {
    if (!canProceedWithSelectedShipping) {
      toast.error(
        shippingOptions.length === 0
          ? "A loja ainda não configurou formas de envio."
          : cartCount === 0
            ? "Seu carrinho esta vazio."
            : requiresDeliveryAddress && !hasValidDeliveryQuote
              ? quoteLoading
                ? "Aguarde o cálculo do frete."
                : deliveryQuote?.message || "Este endereço está fora da área de entrega. Escolha retirada ou informe outro CEP."
              : selectedShippingOption?.method === "pickup" && !pickupAddressConfigured
                ? "A loja ainda não configurou o endereço para retirada. Escolha entrega local ou fale com a loja."
          : "Complete seus dados antes de seguir para o pagamento.",
      );
      return;
    }

    setLoading(true);
    try {
      const checkoutRequest = buildCheckoutRequest();
      const response = await createMercadoPagoCheckout(checkoutRequest);
      if (!response.data.checkoutUrl) throw new Error("O provedor não retornou o link de pagamento.");
      window.location.href = response.data.checkoutUrl;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        (typeof error.response?.data === "string" ? error.response.data : "") ||
        "Não foi possível iniciar o checkout Mercado Pago.";
      toast.error(
        errorMessage,
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentClick = () => {
    if (!customer) {
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }
    handleFinalizeSale();
  };

  if (cartCount === 0) {
    return (
      <section className="mx-auto mt-16 min-h-[70vh] w-full max-w-6xl px-4 py-6 sm:px-6 md:mt-28 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-950 md:text-4xl">
            Carrinho
          </h1>
          <p className="mt-2 text-base md:text-lg text-gray-600">
            Adicione produtos ao carrinho para revisar e finalizar sua compra.
          </p>
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white px-5 py-12 text-center shadow-sm sm:px-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 text-purple-600">
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
            className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-black-1000 px-6 font-semibold text-white transition hover:opacity-90"
          >
            Ver produtos
          </Link>
        </section>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-16 min-h-[40vh] w-full max-w-6xl px-4 py-6 sm:px-6 md:mt-28 md:py-12">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
            Carrinho
          </h1>
          <p className="mt-2 text-base text-gray-600">
            {cartCount} {cartCount === 1 ? "item" : "itens"} no seu pedido
          </p>
        </div>
        <Link href="/" className="text-sm font-semibold text-gray-700 underline decoration-gray-300 underline-offset-4 hover:text-black">
            Adicionar mais produtos
        </Link>
      </div>
      <section className="my-4 flex w-full flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-950">Seus produtos</h2>
          <span className="text-sm text-gray-500">
            {cartCount} {cartCount === 1 ? "item" : "itens"}
          </span>
        </div>
        {cartCount > 0 ? (
          <div className="flex flex-col gap-3">
            {Object.entries(cartDetails).map(([key, product]: [any, any]) => {
              const stockQuantity = Number(product.stockQuantity || 0);
              const reachedStockLimit =
                stockQuantity > 0 && Number(product.quantity || 0) >= stockQuantity;
              return (
              <div
                key={key}
                className="flex flex-col gap-4 rounded-xl border border-gray-100 p-3 sm:p-4 md:flex-row md:items-center md:justify-between"
              >
                <Link href={`/details/${product.productId || product.id}`}>
                  <div className="flex items-center gap-4 group">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-24 sm:w-24">
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

                <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => removeItem(product)}
                      disabled={product.quantity <= 1}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Aumentar quantidade"
                    >
                      <FiPlus className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="ml-auto flex items-center gap-3">
                    <ProductPrice
                      price={product.price}
                      promo={product.promo}
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(product, product.quantity)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Remover produto"
                    >
                      <FiXCircle className="h-6 w-6 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            )})}
          </div>
        ) : (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-900">
            <p className="font-semibold">Seu pedido ainda não tem produtos.</p>
            <Link
              href="/"
              className="mt-3 inline-flex rounded-md bg-black-1000 py-2 text-sm font-semibold text-white"
            >
              Escolher produtos
            </Link>
          </div>
        )}
      </section>
      {requiresCustomerLogin ? (
        <section className="my-4 flex w-full flex-col rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="mt-0.5 shrink-0 text-xl text-blue-700" />
            <div>
              <h2 className="font-semibold text-blue-950">Entre para continuar seu pedido</h2>
              <p className="mt-1 text-sm leading-6 text-blue-900">
                Esta loja aceita pagamento online. Entre com sua conta para informar seus dados,
                calcular a entrega e finalizar a compra com segurança.
              </p>
              <button
                type="button"
                onClick={handlePaymentClick}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#009ee3] px-5 py-3 font-semibold text-white transition hover:bg-[#008ac7]"
              >
                Fazer login para continuar
                <FiChevronRight className="text-lg" />
              </button>
            </div>
          </div>
        </section>
      ) : (
        <>
      {customer && (
      <div className="grid gap-3 py-1 md:grid-cols-2 md:gap-4">
        <section className="my-2 flex w-full flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="font-semibold text-gray-950">
            Informações de contato{" "}
            <Link
              href={"/account"}
              className="ml-1 text-sm font-medium text-gray-500 underline decoration-gray-300 underline-offset-4 hover:text-gray-900"
            >
              Alterar
            </Link>
          </h2>
          <div className="space-y-2 break-words text-sm text-gray-700">
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
        </section>
        <section className="my-2 flex w-full flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="font-semibold text-gray-950">
            Endereço de entrega{" "}
            <Link
              href={"/account"}
              className="ml-1 text-sm font-medium text-gray-500 underline decoration-gray-300 underline-offset-4 hover:text-gray-900"
            >
              Alterar
            </Link>
          </h2>
          {address ? (
            <div className="space-y-2 break-words text-sm text-gray-700">
              <p className="break-all">
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
        </section>
      </div>
      )}
      <section className="my-4 flex w-full flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        {!canFinalizeOrder && (
          <div className="mb-2 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-900">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="mt-1 text-xl shrink-0" />
              <div>
                <p className="font-semibold">
                  {shippingOptions.length === 0
                    ? "A loja ainda não configurou formas de envio"
                    : cartCount === 0
                      ? "Adicione produtos para seguir para o pagamento"
                      : "Complete seus dados para finalizar o pedido"}
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
                      className="mt-3 inline-flex rounded-lg bg-black-1000 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Completar cadastro
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        <div>
          <div className="flex w-full flex-col justify-between items-stretch gap-2">
            <div className="flex w-full flex-col items-stretch justify-center gap-2">
              <h2 className="font-semibold text-gray-950">Forma de envio</h2>
              {shippingOptions.length === 0 && (
                <p className="text-sm text-red-600">
                  Esta loja ainda não configurou formas de envio.
                </p>
              )}
              {shippingOptions.map((option) => (
                <label
                  key={option.method}
                  className={`flex w-full flex-col gap-3 rounded-xl border p-4 transition ${selectedShippingOption?.method === option.method ? "border-green-200 bg-green-50" : "border-gray-200 bg-white hover:border-gray-300"} ${option.available === false ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      value={option.method}
                      disabled={option.available === false}
                      onChange={() => {
                        setShippingManuallySelected(true);
                        setShippingMethod(option.method);
                        setShippingLabel(option.label);
                        setFrete(option.fee);
                      }}
                      checked={selectedShippingOption?.method === option.method}
                      className="mt-1 h-4 w-4 accent-green-700"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <strong>{option.label}</strong>
                        <strong className="text-sm">
                          {option.method === "local_delivery" && quoteLoading
                            ? "Calculando…"
                            : option.method === "local_delivery" && !deliveryQuote?.available
                              ? "Consultar CEP"
                              : option.fee > 0 ? formatCurrency(option.fee) : "Grátis"}
                        </strong>
                      </span>
                      <span className="text-sm text-gray-500">{option.description}</span>
                      {option.method === "local_delivery" && freeShippingMinAmount > 0 && (
                        <span className="text-xs font-medium text-green-700">
                          {isFreeLocalDelivery
                            ? "Frete grátis aplicado"
                            : `Frete grátis acima de ${formatCurrency(freeShippingMinAmount)}`}
                        </span>
                      )}
                    </span>
                  </span>
                  {selectedShippingOption?.method === option.method && (
                    <span className="ml-7 block border-t border-gray-200/80 pt-3 text-sm">
                      {option.method === "pickup" ? (
                        <span className="flex flex-col gap-1">
                          <strong className="text-gray-800">Endereço para retirada</strong>
                          <span className={pickupAddressConfigured ? "text-gray-600" : "text-amber-700"}>{pickupAddressLabel}</span>
                          {pickupAddress?.reference && <span className="text-gray-500">Referência: {pickupAddress.reference}</span>}
                        </span>
                      ) : option.method.startsWith("melhor_envio:") ? (
                        <span className="flex flex-col gap-1">
                          <span className="text-gray-600">Cotação calculada pelo Melhor Envio com base no CEP e nos dados dos produtos.</span>
                        </span>
                      ) : (
                        <span className="flex flex-col gap-1">
                          <span className={deliveryQuote?.available ? "text-gray-600" : "text-amber-700"} role={!deliveryQuote?.available && !quoteLoading ? "alert" : undefined}>
                            {quoteLoading ? "Calculando distância aproximada pelo CEP…" : deliveryQuote?.available
                              ? `Distância aproximada: ${deliveryQuote.distanceKm} km${localDeliveryEtaLabel ? ` · Prazo: ${localDeliveryEtaLabel}` : ""}.`
                              : deliveryQuote?.message || "Informe um CEP válido no seu cadastro para consultar a entrega."}
                          </span>
                          {deliveryQuote?.available && <span className="text-gray-500">O cálculo é aproximado e pode não refletir o trajeto pelas ruas.</span>}
                        </span>
                      )}
                    </span>
                  )}
                </label>
              ))}
              {storeInfo?.melhorEnvioConfigured && paymentConfigured && melhorEnvioQuoteLoading && (
                <p className="text-sm text-gray-500">Calculando opções do Melhor Envio…</p>
              )}
              {shouldShowFreeShippingProgress && (
                <div className="mt-2 w-full rounded-xl border border-gray-100 bg-gray-50 p-4">
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

        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
          <h2 className="text-lg font-semibold text-gray-950">Resumo do pagamento</h2>
          <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Produtos</span>
              <span>{formatCurrency(discountPrice)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>{shippingLabel || "Envio"}</span>
              <span>{shippingPriceLabel}</span>
            </div>
          </div>
          <TotalPrice
            price={discountPrice + frete}
            fullPrice={totalPrice + frete}
          ></TotalPrice>
          <p className="text-sm text-gray-500">
            {paymentConfigured
              ? "Você será direcionado para uma página segura de pagamento."
              : "A loja receberá seu pedido pelo WhatsApp e combinará a confirmação com você."}
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 pt-4 md:flex-row md:border-t-0 md:pt-2">
          {paymentConfigured && customer && canProceedWithSelectedShipping ? (
            <button
              onClick={handlePaymentClick}
              disabled={loading || !canProceedWithSelectedShipping}
              className="flex w-full flex-row items-center justify-center gap-2 self-end rounded-xl bg-[#009ee3] px-5 py-3 font-semibold text-white transition hover:bg-[#008ac7] disabled:cursor-not-allowed disabled:opacity-50 md:mt-6"
            >
              <SiMercadopago className="h-6 w-6" aria-hidden="true" />
              {loading ? "Preparando pagamento..." : "Pagar com Mercado Pago"}
            </button>
          ) : !paymentConfigured && canProceedWithSelectedShipping ? (
            <a
              href={storeInfo.whatsapp ? `https://api.whatsapp.com/send?phone=55${storeInfo.whatsapp.replace(/\D/g, "")}&text=${encodeURIComponent(buildWhatsAppMessage())}` : undefined}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => {
                if (!canProceedWithSelectedShipping || !storeInfo.whatsapp) event.preventDefault();
              }}
              aria-disabled={!canProceedWithSelectedShipping || !storeInfo.whatsapp}
              tabIndex={!canProceedWithSelectedShipping || !storeInfo.whatsapp ? -1 : undefined}
              className={`flex w-full items-center justify-center gap-2 rounded-xl bg-green-whatsapp px-5 py-3 font-semibold text-white md:mt-6 ${!canProceedWithSelectedShipping || !storeInfo.whatsapp ? "cursor-not-allowed opacity-50" : ""}`}
            >
              Finalizar pelo WhatsApp
              <FiChevronRight className="text-lg" />
            </a>
          ) : paymentConfigured && !customer ? (
            <button
              type="button"
              onClick={handlePaymentClick}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#009ee3] px-5 py-3 font-semibold text-white transition hover:bg-[#008ac7] md:mt-6"
            >
              Faça login para continuar
              <FiChevronRight className="text-lg" />
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-gray-300 px-5 py-3 font-semibold text-gray-600 md:mt-6"
              aria-live="polite"
            >
              {selectedDeliveryBlocked
                ? quoteLoading
                  ? "Calculando entrega…"
                  : "Entrega indisponível para este CEP"
                : "Complete os dados para continuar"}
            </button>
          )}
        </div>
        </section>
        </>
      )}
      </section>
  );
};

export default Checkout;
