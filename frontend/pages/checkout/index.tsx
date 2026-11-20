import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  createMercadoPagoCheckout,
  findAddressByCep,
  getCustomerByEmail,
  getLocalDeliveryQuote,
  getMelhorEnvioQuote,
} from "@/lib/client";
import { toast } from "react-hot-toast";
import { useShoppingCart } from "@/hooks/use-shopping-cart";
import { useRouter } from "next/router";
import { useAuth } from "@/components/Context/authContext";
import Link from "next/link";
import { Customer } from "@/types/CustomerTypes";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiChevronRight,
  FiLogIn,
  FiShoppingBag,
} from "react-icons/fi";
import TotalPrice from "@/components/TotalPrice";
import useStoreInfo from "@/hooks/use-store-info";
import { formatCurrency, formatSimpleCurrency } from "@/lib/utils";
import { SiMercadopago } from "react-icons/si";
import Spinner from "@/components/spinner";
import {
  isGuestCheckoutDraftComplete,
  hasGuestCheckoutAccess,
  isValidCpf,
  readGuestCheckoutDraft,
  saveGuestCheckoutDraft,
} from "@/lib/guestCheckout";
import CheckoutStepper from "@/components/checkoutStepper";
import {
  CheckoutStepCard,
  CheckoutStepFooter,
  CheckoutStepHeading,
} from "@/components/checkoutStepLayout";

const Checkout = () => {
  const router = useRouter();
  const { cartDetails, cartCount } = useShoppingCart();
  const [hasMounted, setHasMounted] = useState(false);
  const [checkoutAccessResolved, setCheckoutAccessResolved] = useState(false);
  const { customer } = useAuth();
  const storeInfo = useStoreInfo();
  const [frete, setFrete] = useState(0);
  const [deliveryQuote, setDeliveryQuote] = useState<any>(null);
  const [melhorEnvioQuotes, setMelhorEnvioQuotes] = useState<any[]>([]);
  const [melhorEnvioQuoteLoading, setMelhorEnvioQuoteLoading] = useState(false);
  const [melhorEnvioQuoteError, setMelhorEnvioQuoteError] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [shippingMethod, setShippingMethod] = useState("");
  const [shippingLabel, setShippingLabel] = useState("");
  const [shippingManuallySelected, setShippingManuallySelected] =
    useState(false);
  const [customerDataStatus, setCustomerDataStatus] = useState<
    "idle" | "loading" | "loaded" | "error"
  >("idle");
  const [customerDataEmail, setCustomerDataEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestContact, setGuestContact] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
  });
  const [guestContactError, setGuestContactError] = useState("");
  const [guestAddress, setGuestAddress] = useState({
    zip: "",
    street: "",
    number: "",
    district: "",
    city: "",
    state: "",
    reference: "",
  });
  const [shippingZipLookup, setShippingZipLookup] = useState(false);
  const [shippingZipLookupError, setShippingZipLookupError] = useState("");
  const [verifiedShippingZip, setVerifiedShippingZip] = useState("");
  const [guestDraftLoaded, setGuestDraftLoaded] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1);
  const [deliverySubstep, setDeliverySubstep] = useState<"method" | "address">(
    "method",
  );
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
      {
        zip: "",
        street: "",
        number: 0,
        district: "",
        city: "",
        state: "",
        reference: "",
      },
    ],
  });
  const fetchCustomers = useCallback(() => {
    if (!customer?.username) {
      return;
    }
    const email = customer.username;
    setCustomerDataEmail(email);
    setCustomerDataStatus("loading");
    getCustomerByEmail(customer.username)
      .then((res) => {
        setFullCustomer(res.data);
        setGuestContact({
          name: res.data.name || "",
          email: res.data.email || "",
          phone: res.data.phone || "",
          cpf: res.data.cpf || "",
        });
        const savedAddress = res.data.addresses?.[0];
        if (savedAddress) {
          setGuestAddress({
            zip: savedAddress.zip || "",
            street: savedAddress.street || "",
            number: savedAddress.number ? String(savedAddress.number) : "",
            district: savedAddress.district || "",
            city: savedAddress.city || "",
            state: savedAddress.state || "",
            reference: savedAddress.reference || "",
          });
        }
        setCustomerDataEmail(email);
        setCustomerDataStatus("loaded");
      })
      .catch((err) => {
        setCustomerDataStatus("error");
        toast.error(
          err.response?.data?.message ||
            "Não foi possível carregar seus dados. Tente novamente.",
        );
      });
  }, [customer?.username]);

  const fetchProducts = useCallback(() => {
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
  }, [cartDetails]);

  useEffect(() => {
    setHasMounted(true);
    if (customer?.username) {
      fetchCustomers();
      setGuestDraftLoaded(true);
    } else {
      const draft = readGuestCheckoutDraft();
      setGuestContact({
        name: draft.name,
        email: draft.email,
        phone: draft.phone,
        cpf: draft.cpf,
      });
      setGuestAddress(draft.address);
      setGuestDraftLoaded(true);
    }
  }, [customer?.username, fetchCustomers]);

  useEffect(() => {
    if (!hasMounted || !router.isReady) return;
    if (customer || hasGuestCheckoutAccess()) {
      setCheckoutAccessResolved(true);
      return;
    }

    router.replace(`/login?redirect=${encodeURIComponent("/checkout")}`);
  }, [customer, hasMounted, router]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const pickupEnabled = storeInfo?.pickupEnabled !== false;
  const localDeliveryEnabled = storeInfo?.localDeliveryEnabled !== false;
  const freeShippingMinAmount = storeInfo?.freeShippingMinAmount || 0;
  const localDeliveryEta = String(storeInfo?.localDeliveryEta || "").trim();
  const localDeliveryEtaLabel = /^\d+(?:[,.]\d+)?$/.test(localDeliveryEta)
    ? `${localDeliveryEta} dias úteis`
    : localDeliveryEta;
  const isFreeLocalDelivery = Boolean(
    deliveryQuote?.available &&
    deliveryQuote.fee === 0 &&
    freeShippingMinAmount > 0 &&
    discountPrice >= freeShippingMinAmount,
  );
  const freeShippingRemaining = Math.max(
    freeShippingMinAmount - discountPrice,
    0,
  );
  const freeShippingProgress =
    freeShippingMinAmount > 0
      ? Math.min((discountPrice / freeShippingMinAmount) * 100, 100)
      : 0;
  const pickupAddress = storeInfo?.pickupAddress;
  const melhorEnvioOriginAddress = storeInfo?.melhorEnvioOriginAddress;
  const melhorEnvioOriginZip = (
    storeInfo?.melhorEnvioOriginZip ||
    melhorEnvioOriginAddress?.zip ||
    ""
  ).replace(/\D/g, "");
  const pickupAddressConfigured = Boolean(
    pickupAddress?.zip?.trim() &&
    pickupAddress?.street?.trim() &&
    pickupAddress?.number?.trim() &&
    pickupAddress?.district?.trim() &&
    pickupAddress?.city?.trim() &&
    pickupAddress?.state?.trim(),
  );
  const pickupAddressLabel = pickupAddressConfigured
    ? `${pickupAddress?.street}, ${pickupAddress?.number} · ${pickupAddress?.district}, ${pickupAddress?.city} - ${pickupAddress?.state} · CEP ${pickupAddress?.zip}`
    : "A loja ainda não informou o endereço de retirada.";
  const mercadoPagoConfigured = storeInfo?.mercadoPagoConfigured === true;
  const paymentConfigured = mercadoPagoConfigured;
  const isWhatsAppOnly = !paymentConfigured;
  const customerProfileLoading =
    Boolean(customer?.username) &&
    (customerDataEmail !== customer.username ||
      customerDataStatus === "idle" ||
      customerDataStatus === "loading");
  const customerProfileError =
    Boolean(customer?.username) &&
    customerDataEmail === customer.username &&
    customerDataStatus === "error";

  useEffect(() => {
    if (!guestDraftLoaded || customer) return;
    saveGuestCheckoutDraft({ ...guestContact, address: guestAddress });
  }, [guestDraftLoaded, customer, guestContact, guestAddress]);

  const melhorEnvioOptions = useMemo(
    () =>
      storeInfo?.melhorEnvioConfigured
        ? melhorEnvioQuotes.map((quote) => ({
            method: `melhor_envio:${quote.id}`,
            label: quote.name || quote.company?.name || "Melhor Envio",
            description: quote.delivery_range
              ? `${quote.delivery_range.min} a ${quote.delivery_range.max} dias úteis.`
              : "Entrega calculada pelo Melhor Envio.",
            fee: Math.round(
              Number(
                String(quote.custom_price || quote.price || 0).replace(
                  ",",
                  ".",
                ),
              ) * 100,
            ),
            quoteToken: quote.kiziQuoteToken,
          }))
        : [],
    [storeInfo?.melhorEnvioConfigured, melhorEnvioQuotes],
  );

  const shippingOptions = useMemo(
    () =>
      [
        pickupEnabled && pickupAddressConfigured
          ? {
              method: "pickup",
              label: "Retirada na loja",
              description: "Retire seu pedido diretamente com a loja.",
              fee: 0,
              available: pickupAddressConfigured,
            }
          : null,
        paymentConfigured &&
        localDeliveryEnabled &&
        deliveryQuote?.available !== false
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
        quoteToken?: string;
      }[],
    [
      pickupEnabled,
      pickupAddressConfigured,
      paymentConfigured,
      localDeliveryEnabled,
      deliveryQuote?.available,
      deliveryQuote?.fee,
      localDeliveryEtaLabel,
      melhorEnvioOptions,
    ],
  );
  const selectedShippingOption = useMemo(
    () =>
      shippingOptions.find((option) => option.method === shippingMethod) ||
      shippingOptions[0],
    [shippingOptions, shippingMethod],
  );
  const shouldShowFreeShippingProgress =
    localDeliveryEnabled &&
    selectedShippingOption?.method === "local_delivery" &&
    deliveryQuote?.available &&
    !quoteLoading &&
    freeShippingMinAmount > 0;
  const requiresDeliveryAddress =
    selectedShippingOption?.method === "local_delivery" ||
    selectedShippingOption?.method?.startsWith("melhor_envio:");
  const showShippingMethodStep =
    deliverySubstep === "method" || !requiresDeliveryAddress;
  const hasText = (value?: string | null) => Boolean(value && value.trim());
  const formatCep = (value?: string | null) => {
    const digits = String(value || "")
      .replace(/\D/g, "")
      .slice(0, 8);
    return digits.length > 5
      ? `${digits.slice(0, 5)}-${digits.slice(5)}`
      : digits;
  };
  const maskCpf = (value?: string) => {
    const digits = (value || "").replace(/\D/g, "");
    return digits.length === 11
      ? `•••.•••.•••-${digits.slice(-2)}`
      : "não informado";
  };
  const address = customer ? fullCustomer.addresses?.[0] : guestAddress;
  const currentShippingZip = String(address?.zip || "").replace(/\D/g, "");
  const hasValidShippingZip =
    currentShippingZip.length === 8 &&
    verifiedShippingZip === currentShippingZip &&
    !shippingZipLookup &&
    !shippingZipLookupError;

  useEffect(() => {
    const zip = String(address?.zip || "").replace(/\D/g, "");
    setVerifiedShippingZip("");
    if (zip.length !== 8) {
      setShippingZipLookup(false);
      setShippingZipLookupError("");
      return;
    }

    let active = true;
    setShippingZipLookup(true);
    setShippingZipLookupError("");
    findAddressByCep(zip)
      .then((response) => {
        if (!active) return;
        if (response.data?.erro) {
          setShippingZipLookupError(
            "CEP não encontrado. Confira e tente novamente.",
          );
          return;
        }
        setVerifiedShippingZip(zip);
        if (!customer) {
          setGuestAddress((current) => ({
            ...current,
            zip,
            street: current.street || response.data.logradouro || "",
            district: current.district || response.data.bairro || "",
            city: current.city || response.data.localidade || "",
            state: current.state || response.data.uf || "",
          }));
        }
      })
      .catch(() => {
        if (active)
          setShippingZipLookupError(
            "Não foi possível consultar o CEP. Tente novamente.",
          );
      })
      .finally(() => {
        if (active) setShippingZipLookup(false);
      });

    return () => {
      active = false;
    };
  }, [customer, customer?.username, address?.zip]);
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
      .then((response) => {
        if (active) setDeliveryQuote(response.data);
      })
      .catch((error) => {
        if (active)
          setDeliveryQuote({
            available: false,
            message:
              error.response?.data?.message ||
              "Não foi possível calcular a entrega para este CEP.",
          });
      })
      .finally(() => {
        if (active) setQuoteLoading(false);
      });
    return () => {
      active = false;
    };
  }, [localDeliveryEnabled, address?.zip, discountPrice, storeInfo?.domain]);
  useEffect(() => {
    if (
      !storeInfo?.melhorEnvioConfigured ||
      !address?.zip ||
      discountPrice <= 0
    ) {
      setMelhorEnvioQuotes([]);
      setMelhorEnvioQuoteError("");
      return;
    }
    if (melhorEnvioOriginZip.length !== 8) {
      setMelhorEnvioQuotes([]);
      setMelhorEnvioQuoteError(
        "A loja ainda não configurou um endereço de postagem válido no Melhor Envio.",
      );
      return;
    }
    const items = Object.values(cartDetails).map((product: any) => ({
      productId: Number(product.productId || String(product.id).split(":")[0]),
      variationId: product.variationId || null,
      quantity: product.quantity,
    }));
    let active = true;
    setMelhorEnvioQuoteError("");
    setMelhorEnvioQuoteLoading(true);
    getMelhorEnvioQuote({
      destinationZip: address.zip.replace(/\D/g, ""),
      items,
    })
      .then((response) => {
        if (!active) return;
        const quotes = Array.isArray(response.data) ? response.data : [];
        const availableQuotes = quotes.filter(
          (quote: any) => !quote.error && quote.id,
        );
        setMelhorEnvioQuotes(availableQuotes);
        if (availableQuotes.length === 0) {
          const providerErrors = Array.from(
            new Set(
              quotes
                .map((quote: any) => quote.error)
                .filter(Boolean)
                .map((error: any) =>
                  typeof error === "string"
                    ? error
                    : error.message || JSON.stringify(error),
                ),
            ),
          );
          const dimensionLimitReached = providerErrors.some((error) =>
            /dimensões?.*(limite|ultrapass)|limite.*dimensões?/i.test(error),
          );
          setMelhorEnvioQuoteError(
            dimensionLimitReached
              ? "As dimensões cadastradas para um produto ultrapassam o limite das transportadoras. Confira as dimensões no cadastro do produto ou escolha outra forma de entrega."
              : providerErrors.length > 0
                ? providerErrors.join(" ")
                : "Nenhuma opção do Melhor Envio atende este CEP e os produtos do carrinho.",
          );
        }
      })
      .catch((error) => {
        if (active) {
          setMelhorEnvioQuotes([]);
          setMelhorEnvioQuoteError(
            error.response?.data?.message ||
              (typeof error.response?.data === "string"
                ? error.response.data
                : "") ||
              "Não foi possível consultar o Melhor Envio para este endereço.",
          );
        }
      })
      .finally(() => {
        if (active) setMelhorEnvioQuoteLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    storeInfo?.melhorEnvioConfigured,
    melhorEnvioOriginZip,
    address?.zip,
    discountPrice,
    cartDetails,
  ]);
  useEffect(() => {
    if (shippingMethod === "local_delivery" && deliveryQuote?.available)
      setFrete(deliveryQuote.fee);
    else if (shippingMethod?.startsWith("melhor_envio:")) {
      setFrete(selectedShippingOption?.fee || 0);
    } else if (
      shippingMethod === "pickup" ||
      shippingMethod === "local_delivery"
    )
      setFrete(0);
  }, [shippingMethod, deliveryQuote, selectedShippingOption?.fee]);
  const missingCheckoutFields = [
    !customer &&
    !isGuestCheckoutDraftComplete({ ...guestContact, address: guestAddress })
      ? "dados do comprador"
      : null,
    !hasValidShippingZip
      ? shippingZipLookup
        ? "aguarde a validação do CEP"
        : "CEP válido"
      : null,
    requiresDeliveryAddress && (!address || !hasText(address.zip))
      ? "CEP"
      : null,
    requiresDeliveryAddress && (!address || !hasText(address.street))
      ? "rua"
      : null,
    requiresDeliveryAddress &&
    (!address ||
      !Number.isInteger(Number(address.number)) ||
      Number(address.number) <= 0)
      ? "número"
      : null,
    requiresDeliveryAddress && (!address || !hasText(address.district))
      ? "bairro"
      : null,
    requiresDeliveryAddress && (!address || !hasText(address.city))
      ? "cidade"
      : null,
    requiresDeliveryAddress && (!address || !hasText(address.state))
      ? "UF"
      : null,
  ].filter(Boolean) as string[];
  const canFinalizeOrder =
    cartCount > 0 &&
    !customerProfileLoading &&
    !customerProfileError &&
    missingCheckoutFields.length === 0 &&
    shippingOptions.length > 0;
  const hasValidDeliveryQuote =
    hasValidShippingZip &&
    (isWhatsAppOnly ||
      selectedShippingOption?.method !== "local_delivery" ||
      (deliveryQuote?.available && !quoteLoading));
  const hasValidSelectedShipping = selectedShippingOption?.method?.startsWith(
    "melhor_envio:",
  )
    ? Boolean(selectedShippingOption.quoteToken)
    : selectedShippingOption?.method !== "pickup" || pickupAddressConfigured;
  const canProceedWithSelectedShipping =
    canFinalizeOrder && hasValidDeliveryQuote && hasValidSelectedShipping;
  const customerContactIsComplete = Boolean(
    hasText(fullCustomer.name) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(fullCustomer.email || "")) &&
    String(fullCustomer.phone || "").replace(/\D/g, "").length >= 10 &&
    String(fullCustomer.phone || "").replace(/\D/g, "").length <= 15 &&
    isValidCpf(String(fullCustomer.cpf || "")),
  );
  const guestContactIsComplete = isGuestCheckoutDraftComplete({
    ...guestContact,
    address: guestAddress,
  });
  const canContinueFromContact = customer
    ? customerContactIsComplete
    : guestContactIsComplete;

  useEffect(() => {
    if (!router.isReady) return;
    const requestedStep = Array.isArray(router.query.step)
      ? router.query.step[0]
      : router.query.step;
    if (requestedStep !== "2") return;
    if (!guestDraftLoaded || (customer && customerProfileLoading)) return;

    if (!canContinueFromContact) {
      setCheckoutStep(1);
      setDeliverySubstep("method");
      return;
    }

    setCheckoutStep(2);
    setDeliverySubstep(
      router.query.substep === "address" ? "address" : "method",
    );
  }, [
    router.isReady,
    router.query.step,
    router.query.substep,
    guestDraftLoaded,
    customer,
    customerProfileLoading,
    canContinueFromContact,
  ]);

  useEffect(() => {
    if (checkoutStep !== 2 || !guestDraftLoaded) return;
    if (customer && customerProfileLoading) return;
    if (canContinueFromContact) return;

    setCheckoutStep(1);
    setDeliverySubstep("method");
  }, [
    checkoutStep,
    guestDraftLoaded,
    customer,
    customerProfileLoading,
    canContinueFromContact,
  ]);

  const canContinueFromShippingMethod =
    canContinueFromContact &&
    hasValidShippingZip &&
    shippingOptions.length > 0 &&
    !customerProfileLoading &&
    !customerProfileError &&
    hasValidDeliveryQuote &&
    hasValidSelectedShipping;
  const selectedDeliveryBlocked =
    selectedShippingOption?.method === "local_delivery" &&
    !hasValidDeliveryQuote;
  const shippingPriceLabel =
    selectedShippingOption?.method !== "local_delivery"
      ? selectedShippingOption?.method?.startsWith("melhor_envio:")
        ? formatCurrency(selectedShippingOption.fee)
        : "Grátis"
      : quoteLoading
        ? "Calculando…"
        : deliveryQuote?.available
          ? deliveryQuote.fee > 0
            ? formatCurrency(deliveryQuote.fee)
            : "Grátis"
          : "Indisponível";
  const buildCheckoutRequest = useCallback(
    () => ({
      saleRequest: {
        saleItemRequests: Object.entries(cartDetails).map(
          ([_, product]: [any, any]) => ({
            productId: Number(product.productId || product.id),
            variationId: product.variationId || null,
            quantity: product.quantity,
          }),
        ),
        customerEmail: customer
          ? fullCustomer.email
          : guestContact.email.trim(),
        paymentMethod: "MERCADO_PAGO",
        shippingFee: frete,
        shippingMethod,
        shippingZip: requiresDeliveryAddress ? address?.zip : null,
        shippingQuote: shippingMethod.startsWith("melhor_envio:")
          ? JSON.stringify({
              method: selectedShippingOption.method,
              label: selectedShippingOption.label,
              fee: selectedShippingOption.fee,
            })
          : null,
        shippingQuoteToken: shippingMethod.startsWith("melhor_envio:")
          ? selectedShippingOption?.quoteToken
          : null,
        guestCustomer: customer
          ? null
          : {
              name: guestContact.name.trim(),
              email: guestContact.email.trim(),
              phone: guestContact.phone,
              cpf: guestContact.cpf,
            },
        guestShippingAddress:
          !customer && requiresDeliveryAddress
            ? {
                zip: guestAddress.zip,
                street: guestAddress.street,
                number: guestAddress.number
                  ? Number(guestAddress.number)
                  : null,
                district: guestAddress.district,
                city: guestAddress.city,
                state: guestAddress.state,
                reference: guestAddress.reference,
              }
            : null,
      },
    }),
    [
      cartDetails,
      customer,
      fullCustomer.email,
      guestContact,
      guestAddress,
      frete,
      shippingMethod,
      address?.zip,
      requiresDeliveryAddress,
      selectedShippingOption,
    ],
  );

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
        : currentOption &&
            (currentOption.method !== "pickup" || pickupAddressConfigured)
          ? currentOption
          : firstSelectableOption || shippingOptions[0];
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
    shippingOptions,
  ]);

  if (!hasMounted || !checkoutAccessResolved) {
    return null;
  }
  if (!storeInfo) return null;
  const buildWhatsAppMessage = () => {
    const items = Object.values(cartDetails)
      .map((product: any) => {
        const variation = product.variationLabel
          ? ` (${product.variationLabel})`
          : "";
        return `- ${product.quantity}x ${product.name}${variation}`;
      })
      .join("\n");
    const addressText =
      selectedShippingOption?.method === "local_delivery" && address
        ? `\nEndereço: ${address.street}, ${address.number} - ${address.district}, ${address.city} - CEP ${address.zip}`
        : "";
    const pickupText =
      selectedShippingOption?.method === "pickup"
        ? `\nEndereço para retirada: ${pickupAddressLabel}${pickupAddress?.reference ? `\nReferência: ${pickupAddress.reference}` : ""}`
        : "";
    const deliveryCost =
      selectedShippingOption?.method === "local_delivery" &&
      !deliveryQuote?.available
        ? "a confirmar com a loja"
        : frete > 0
          ? formatCurrency(frete)
          : "Grátis";
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
                : deliveryQuote?.message ||
                  "Este endereço está fora da área de entrega. Escolha retirada ou informe outro CEP."
              : selectedShippingOption?.method === "pickup" &&
                  !pickupAddressConfigured
                ? "A loja ainda não configurou o endereço para retirada. Escolha entrega local ou fale com a loja."
                : "Complete seus dados antes de seguir para o pagamento.",
      );
      return;
    }

    setLoading(true);
    try {
      const checkoutRequest = buildCheckoutRequest();
      const response = await createMercadoPagoCheckout(checkoutRequest);
      if (!response.data.checkoutUrl)
        throw new Error("O provedor não retornou o link de pagamento.");
      window.location.href = response.data.checkoutUrl;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        (typeof error.response?.data === "string" ? error.response.data : "") ||
        "Não foi possível iniciar o checkout Mercado Pago.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentClick = () => {
    handleFinalizeSale();
  };

  const handleGuestContactSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidCpf(guestContact.cpf)) {
      setGuestContactError("Confira o CPF informado.");
      return;
    }
    const phoneLength = guestContact.phone.replace(/\D/g, "").length;
    if (phoneLength < 10 || phoneLength > 15) {
      setGuestContactError("Informe um celular válido com DDD.");
      return;
    }
    setGuestContactError("");
    saveGuestCheckoutDraft({ ...guestContact, address: guestAddress });
    setDeliverySubstep("method");
    setCheckoutStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStepChange = (step: 1 | 2 | 3) => {
    if (
      step === 1 ||
      (step === 2 && canContinueFromContact) ||
      (step === 3 && canProceedWithSelectedShipping)
    ) {
      setCheckoutStep(step);
      if (step === 2) setDeliverySubstep("method");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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
            Escolha seus produtos favoritos e volte aqui para confirmar o
            pedido.
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
            {checkoutStep === 1
              ? "Seus dados"
              : checkoutStep === 2
                ? deliverySubstep === "address" && requiresDeliveryAddress
                  ? "Endereço de entrega"
                  : "Entrega"
                : "Pagamento"}
          </h1>
          <p className="mt-2 text-base text-gray-600">
            {cartCount} {cartCount === 1 ? "item" : "itens"} no seu pedido
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-semibold text-gray-700 underline decoration-gray-300 underline-offset-4 hover:text-black"
        >
          Adicionar mais produtos
        </Link>
      </div>
      <div className="mb-8 rounded-2xl border border-gray-100 bg-white px-4 py-5 shadow-sm sm:px-8">
        <CheckoutStepper
          currentStep={checkoutStep}
          onStepChange={handleStepChange}
        />
      </div>
      {checkoutStep === 1 && (
        <>
          <CheckoutStepHeading
            step="Etapa 1 de 3"
            title="Como podemos falar com você?"
            description={
              customer
                ? "Confira os dados que serão usados no pedido. Você pode editá-los no perfil antes de continuar."
                : "Preencha seus dados para a loja confirmar o pedido. Você poderá revisar tudo antes de pagar."
            }
            className="my-4 px-1"
          />
          <CheckoutStepCard>
            {!guestDraftLoaded ? (
              <div
                className="flex min-h-24 items-center justify-center gap-3 text-sm text-gray-600"
                role="status"
              >
                <Spinner label="Preparando seus dados" /> Preparando seus dados…
              </div>
            ) : customer ? (
              customerProfileLoading ? (
                <div
                  className="flex min-h-24 items-center justify-center gap-3 text-sm text-gray-600"
                  role="status"
                >
                  <Spinner label="Carregando seus dados" /> Carregando seus
                  dados de contato…
                </div>
              ) : customerProfileError ? (
                <div
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
                  role="alert"
                >
                  <p>Não foi possível carregar seus dados para esta compra.</p>
                  <button
                    type="button"
                    onClick={fetchCustomers}
                    className="mt-3 rounded-lg bg-gray-950 px-4 py-2 font-semibold text-white"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-gray-950">
                      Contato
                    </h3>
                    <Link
                      href={`/account?redirect=${encodeURIComponent("/checkout?step=1")}`}
                      aria-label="Editar dados de contato"
                      className="inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-gray-700 underline decoration-gray-300 underline-offset-4 transition hover:text-gray-950"
                    >
                      Editar
                    </Link>
                  </div>
                  <div className="mt-3 grid gap-3 rounded-xl border-t border-gray-100 pt-3 text-sm sm:grid-cols-2">
                    <p>
                      <span className="block text-xs text-gray-500">Nome</span>
                      <strong className="mt-1 block">
                        {fullCustomer.name || "Não informado"}
                      </strong>
                    </p>
                    <p>
                      <span className="block text-xs text-gray-500">
                        E-mail
                      </span>
                      <strong className="mt-1 block break-all">
                        {fullCustomer.email || "Não informado"}
                      </strong>
                    </p>
                    <p>
                      <span className="block text-xs text-gray-500">
                        Celular
                      </span>
                      <strong className="mt-1 block">
                        {fullCustomer.phone || "Não informado"}
                      </strong>
                    </p>
                    <p>
                      <span className="block text-xs text-gray-500">CPF</span>
                      <strong className="mt-1 block">
                        {maskCpf(fullCustomer.cpf)}
                      </strong>
                    </p>
                  </div>
                  {!customerContactIsComplete && (
                    <div
                      className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
                      role="alert"
                    >
                      <p className="font-semibold">
                        Complete seu cadastro para continuar
                      </p>
                      <p className="mt-1">
                        Precisamos de nome, e-mail, celular com DDD e CPF válido
                        para preparar o pedido.
                      </p>
                      <p className="mt-2">
                        Edite seu cadastro no perfil e volte para continuar a
                        compra.
                      </p>
                    </div>
                  )}
                  <CheckoutStepFooter
                    backAction={
                      <button
                        type="button"
                        onClick={() => router.back()}
                        className="inline-flex min-h-10 self-center items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-950 focus-visible:underline sm:self-start"
                      >
                        <FiArrowLeft aria-hidden="true" />
                        Voltar
                      </button>
                    }
                    nextAction={
                      <button
                        type="button"
                        onClick={() => handleStepChange(2)}
                        disabled={!customerContactIsComplete}
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gray-950 px-5 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 sm:w-auto"
                      >
                        Continuar para entrega{" "}
                        <FiChevronRight className="ml-2" />
                      </button>
                    }
                  />
                </div>
              )
            ) : (
              <form
                onSubmit={handleGuestContactSubmit}
                className="grid gap-4 sm:grid-cols-2"
              >
                <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                  Nome completo
                  <input
                    autoComplete="name"
                    required
                    maxLength={255}
                    value={guestContact.name}
                    onChange={(event) =>
                      setGuestContact({
                        ...guestContact,
                        name: event.target.value,
                      })
                    }
                    className="min-h-12 rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-gray-800 focus:ring-2 focus:ring-gray-200"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                  E-mail
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={255}
                    value={guestContact.email}
                    onChange={(event) =>
                      setGuestContact({
                        ...guestContact,
                        email: event.target.value,
                      })
                    }
                    className="min-h-12 rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-gray-800 focus:ring-2 focus:ring-gray-200"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                  Celular com DDD
                  <input
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    required
                    minLength={10}
                    maxLength={20}
                    value={guestContact.phone}
                    onChange={(event) => {
                      setGuestContact({
                        ...guestContact,
                        phone: event.target.value,
                      });
                      setGuestContactError("");
                    }}
                    className="min-h-12 rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-gray-800 focus:ring-2 focus:ring-gray-200"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                  CPF
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    maxLength={14}
                    value={guestContact.cpf}
                    onChange={(event) => {
                      setGuestContact({
                        ...guestContact,
                        cpf: event.target.value,
                      });
                      setGuestContactError("");
                    }}
                    className="min-h-12 rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-gray-800 focus:ring-2 focus:ring-gray-200"
                    aria-describedby="checkout-cpf-help"
                    aria-invalid={Boolean(
                      guestContactError && !isValidCpf(guestContact.cpf),
                    )}
                  />
                  <span
                    id="checkout-cpf-help"
                    className="text-xs font-normal text-gray-500"
                  >
                    Usado para identificar a compra e processar o pagamento.
                  </span>
                </label>
                {guestContactError && (
                  <p
                    className="text-sm font-medium text-red-700 sm:col-span-2"
                    role="alert"
                  >
                    {guestContactError}
                  </p>
                )}
                <CheckoutStepFooter
                  className="sm:col-span-2"
                  backAction={
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="inline-flex min-h-10 self-center items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-950 focus-visible:underline sm:self-start"
                    >
                      <FiArrowLeft aria-hidden="true" />
                      Voltar
                    </button>
                  }
                  middleAction={
                    <Link
                      href={`/login?redirect=${encodeURIComponent("/checkout")}`}
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green-600 px-5 font-semibold text-white transition hover:bg-green-700 sm:w-auto"
                    >
                      Entrar ou criar conta <FiLogIn className="ml-2" />
                    </Link>
                  }
                  nextAction={
                    <button
                      type="submit"
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gray-950 px-5 font-semibold text-white transition hover:bg-gray-800 sm:w-auto"
                    >
                      Continuar para entrega <FiChevronRight className="ml-2" />
                    </button>
                  }
                />
              </form>
            )}
          </CheckoutStepCard>
        </>
      )}
      {checkoutStep === 2 && (
        <CheckoutStepHeading
          step="Etapa 2 de 3"
          title={
            deliverySubstep === "address" && requiresDeliveryAddress
              ? "Para onde enviaremos o pedido?"
              : "Informe seu CEP e escolha o tipo de entrega"
          }
          description={
            deliverySubstep === "address" && requiresDeliveryAddress
              ? "Confira onde o pedido será recebido."
              : "Vamos consultar as opções de entrega e retirada disponíveis para sua região."
          }
          className="my-4 px-1"
        />
      )}
      {!customer && checkoutStep === 2 && showShippingMethodStep && (
        <CheckoutStepCard>
          <div className="max-w-xl">
            <h2 className="font-semibold text-gray-950">Destino de envio</h2>
            <label className="mt-4 flex max-w-sm flex-col gap-1.5 text-sm font-medium text-gray-700">
              CEP
              <input
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                value={formatCep(guestAddress.zip)}
                onChange={(event) => {
                  const zip = event.target.value.replace(/\D/g, "").slice(0, 8);
                  setGuestAddress((current) => ({ ...current, zip }));
                  setVerifiedShippingZip("");
                }}
                className="min-h-12 rounded-lg border border-gray-300 px-3 text-base font-normal outline-none focus:border-gray-800 focus:ring-2 focus:ring-gray-200"
                maxLength={9}
                pattern="[0-9]{5}-?[0-9]{3}"
                aria-describedby="delivery-zip-help delivery-zip-status"
                aria-invalid={Boolean(shippingZipLookupError)}
              />
              <span
                id="delivery-zip-help"
                className="text-xs font-normal text-gray-500"
              >
                Digite os 8 números do CEP.
              </span>
              <span
                id="delivery-zip-status"
                className={`min-h-5 text-xs font-normal ${shippingZipLookupError ? "text-amber-700" : "text-gray-500"}`}
                role="status"
              >
                {shippingZipLookup ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner label="Validando CEP" /> Validando CEP…
                  </span>
                ) : shippingZipLookupError ? (
                  shippingZipLookupError
                ) : hasValidShippingZip ? (
                  "CEP confirmado. Escolha uma opção abaixo."
                ) : (
                  ""
                )}
              </span>
            </label>
          </div>
        </CheckoutStepCard>
      )}
      {customer &&
        checkoutStep === 2 &&
        showShippingMethodStep &&
        (customerProfileLoading ? (
          <div
            className="my-2 flex min-h-20 items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 text-sm text-gray-600 shadow-sm"
            role="status"
            aria-live="polite"
          >
            <Spinner label="Carregando seus dados" /> Carregando seus dados de
            contato e entrega…
          </div>
        ) : customerProfileError ? (
          <div
            className="my-2 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900"
            role="alert"
          >
            <p>Não foi possível carregar seus dados para esta compra.</p>
            <button
              type="button"
              onClick={fetchCustomers}
              className="self-start rounded-lg bg-gray-950 px-4 py-2 font-semibold text-white"
            >
              Tentar novamente
            </button>
          </div>
        ) : null)}
      <CheckoutStepCard
        className={
          checkoutStep === 2 && showShippingMethodStep
            ? "flex w-full flex-col gap-4"
            : "hidden"
        }
      >
        {customer && !customerProfileLoading && !customerProfileError && (
          <section className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-medium text-gray-500">
                  CEP do seu endereço salvo
                </h2>
                <p className="mt-1 font-semibold text-gray-900">
                  {formatCep(address?.zip) || "CEP não informado"}
                </p>
                {shippingZipLookup && (
                  <p className="mt-1 text-xs text-gray-500" role="status">
                    Validando CEP…
                  </p>
                )}
                {shippingZipLookupError && (
                  <p className="mt-1 text-xs text-amber-700" role="alert">
                    {shippingZipLookupError}
                  </p>
                )}
              </div>
              <Link
                href={`/account?redirect=${encodeURIComponent("/checkout?step=2")}`}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 transition hover:border-gray-500"
              >
                Alterar CEP no perfil
              </Link>
            </div>
          </section>
        )}
        {!customerProfileLoading &&
          !customerProfileError &&
          (cartCount === 0 || shippingOptions.length === 0) && (
            <div className="mb-2 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-900">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="mt-1 text-xl shrink-0" />
                <div>
                  <p className="font-semibold">
                    {customerProfileLoading
                      ? "Carregando seus dados para a compra"
                      : customerProfileError
                        ? "Não foi possível carregar seu cadastro"
                        : shippingOptions.length === 0
                          ? "A loja ainda não configurou formas de envio"
                          : cartCount === 0
                            ? "Adicione produtos para seguir para o pagamento"
                            : "Complete seus dados para finalizar o pedido"}
                  </p>
                  {customerProfileLoading ? (
                    <p className="mt-1 text-sm" role="status">
                      Estamos buscando seus dados salvos. O checkout será
                      liberado assim que terminar.
                    </p>
                  ) : customerProfileError ? (
                    <button
                      type="button"
                      onClick={fetchCustomers}
                      className="mt-3 inline-flex rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Tentar novamente
                    </button>
                  ) : cartCount === 0 ? (
                    <p className="mt-1 text-sm">
                      Escolha ao menos um produto antes de fechar o pedido.
                    </p>
                  ) : shippingOptions.length === 0 ? (
                    <p className="mt-1 text-sm">
                      Tente novamente mais tarde ou fale com a loja.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        <div
          className={
            checkoutStep === 2 && showShippingMethodStep && hasValidShippingZip
              ? ""
              : "hidden"
          }
        >
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
                          {option.method === "local_delivery" &&
                          quoteLoading ? (
                            <span className="inline-flex items-center gap-2">
                              <Spinner label="Calculando frete" />
                              Calculando…
                            </span>
                          ) : option.method === "local_delivery" &&
                            !deliveryQuote?.available ? (
                            "Consultar CEP"
                          ) : option.fee > 0 ? (
                            formatCurrency(option.fee)
                          ) : (
                            "Grátis"
                          )}
                        </strong>
                      </span>
                      <span className="text-sm text-gray-500">
                        {option.description}
                      </span>
                      {option.method === "local_delivery" &&
                        freeShippingMinAmount > 0 && (
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
                          <strong className="text-gray-800">
                            Endereço para retirada
                          </strong>
                          <span
                            className={
                              pickupAddressConfigured
                                ? "text-gray-600"
                                : "text-amber-700"
                            }
                          >
                            {pickupAddressLabel}
                          </span>
                          {pickupAddress?.reference && (
                            <span className="text-gray-500">
                              Referência: {pickupAddress.reference}
                            </span>
                          )}
                        </span>
                      ) : option.method.startsWith("melhor_envio:") ? (
                        <span className="flex flex-col gap-1">
                          <span className="text-gray-600">
                            Cotação calculada pelo Melhor Envio com base no CEP
                            e nos dados dos produtos.
                          </span>
                        </span>
                      ) : (
                        <span className="flex flex-col gap-1">
                          <span
                            className={
                              deliveryQuote?.available
                                ? "text-gray-600"
                                : "text-amber-700"
                            }
                            role={
                              !deliveryQuote?.available && !quoteLoading
                                ? "alert"
                                : undefined
                            }
                          >
                            {quoteLoading ? (
                              <span className="inline-flex items-center gap-2">
                                <Spinner label="Calculando distância" />
                                Calculando distância aproximada pelo CEP…
                              </span>
                            ) : deliveryQuote?.available ? (
                              `Distância aproximada: ${deliveryQuote.distanceKm} km${localDeliveryEtaLabel ? ` · Prazo: ${localDeliveryEtaLabel}` : ""}.`
                            ) : (
                              deliveryQuote?.message ||
                              (customer
                                ? "Confira se há um CEP de entrega salvo na sua conta."
                                : "Informe seu CEP acima para consultar a entrega.")
                            )}
                          </span>
                          {deliveryQuote?.available && (
                            <span className="text-gray-500">
                              O cálculo é aproximado e pode não refletir o
                              trajeto pelas ruas.
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  )}
                </label>
              ))}
              {storeInfo?.melhorEnvioConfigured && melhorEnvioQuoteLoading && (
                <p className="inline-flex items-center gap-2 text-sm text-gray-500">
                  <Spinner label="Calculando opções do Melhor Envio" />
                  Calculando opções do Melhor Envio…
                </p>
              )}
              {storeInfo?.melhorEnvioConfigured &&
                !melhorEnvioQuoteLoading &&
                melhorEnvioQuoteError && (
                  <div
                    className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                    role="alert"
                  >
                    {melhorEnvioQuoteError}
                  </div>
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
              <div className="mt-3 flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() =>
                    deliverySubstep === "address"
                      ? setDeliverySubstep("method")
                      : handleStepChange(1)
                  }
                  className="inline-flex min-h-10 self-center items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-950 focus-visible:underline sm:self-start"
                >
                  <FiArrowLeft aria-hidden="true" />
                  <span className="sm:hidden">
                    {deliverySubstep === "address"
                      ? "Voltar às opções de entrega"
                      : "Voltar para contato"}
                  </span>
                  <span className="hidden sm:inline">Voltar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (requiresDeliveryAddress) {
                      setDeliverySubstep("address");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    } else {
                      handleStepChange(3);
                    }
                  }}
                  disabled={!canContinueFromShippingMethod}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gray-950 px-5 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 sm:w-auto"
                >
                  {requiresDeliveryAddress
                    ? "Continuar para endereço"
                    : "Continuar para pagamento"}
                  <FiChevronRight className="ml-2" />
                </button>
              </div>
              {!canContinueFromShippingMethod && hasValidShippingZip && (
                <p className="text-sm text-amber-700" role="status">
                  {selectedDeliveryBlocked && quoteLoading
                    ? "Calculando a entrega…"
                    : !hasValidSelectedShipping
                      ? "Esta opção está indisponível no momento."
                      : "Aguarde a cotação de frete para continuar."}
                </p>
              )}
            </div>
          </div>
        </div>
      </CheckoutStepCard>
      {checkoutStep === 2 &&
        deliverySubstep === "address" &&
        requiresDeliveryAddress && (
          <CheckoutStepCard>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-gray-950">
                  Entrega
                </h3>
                {customer && (
                  <Link
                    href={`/account?redirect=${encodeURIComponent("/checkout?step=2&substep=address")}`}
                    aria-label="Editar endereço"
                    className="inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-gray-700 underline decoration-gray-300 underline-offset-4 transition hover:text-gray-950"
                  >
                    Editar
                  </Link>
                )}
              </div>
            </div>
            {customer ? (
              <div className="mt-3 grid gap-3 rounded-xl border-t border-gray-100 pt-3 text-sm sm:grid-cols-2">
                <div className="grid gap-4 rounded-xl text-sm sm:grid-cols-2">
                  <p className="sm:col-span-2">
                    <span className="block text-xs text-gray-500">
                      Endereço
                    </span>
                    <strong className="mt-1 block">
                      {address?.street || "Rua não informada"},{" "}
                      {address?.number || "s/n"}
                    </strong>
                  </p>
                  <p>
                    <span className="block text-xs text-gray-500">Bairro</span>
                    <strong className="mt-1 block">
                      {address?.district || "Não informado"}
                    </strong>
                  </p>
                  <p>
                    <span className="block text-xs text-gray-500">
                      Cidade/UF
                    </span>
                    <strong className="mt-1 block">
                      {address?.city || "Não informada"}/
                      {address?.state || "--"}
                    </strong>
                  </p>
                  {address?.reference && (
                    <p className="sm:col-span-2">
                      <span className="block text-xs text-gray-500">
                        Referência
                      </span>
                      <strong className="mt-1 block">
                        {address.reference}
                      </strong>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700 sm:col-span-2">
                  Rua ou avenida
                  <input
                    autoComplete="address-line1"
                    required
                    maxLength={255}
                    value={guestAddress.street}
                    onChange={(event) =>
                      setGuestAddress({
                        ...guestAddress,
                        street: event.target.value,
                      })
                    }
                    className="min-h-12 rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-gray-800 focus:ring-2 focus:ring-gray-200"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                  Número
                  <input
                    autoComplete="address-line2"
                    required
                    inputMode="numeric"
                    value={guestAddress.number}
                    onChange={(event) =>
                      setGuestAddress({
                        ...guestAddress,
                        number: event.target.value.replace(/\D/g, ""),
                      })
                    }
                    className="min-h-12 rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-gray-800 focus:ring-2 focus:ring-gray-200"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                  Bairro
                  <input
                    autoComplete="address-level3"
                    required
                    maxLength={120}
                    value={guestAddress.district}
                    onChange={(event) =>
                      setGuestAddress({
                        ...guestAddress,
                        district: event.target.value,
                      })
                    }
                    className="min-h-12 rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-gray-800 focus:ring-2 focus:ring-gray-200"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                  Cidade
                  <input
                    autoComplete="address-level2"
                    required
                    maxLength={120}
                    value={guestAddress.city}
                    onChange={(event) =>
                      setGuestAddress({
                        ...guestAddress,
                        city: event.target.value,
                      })
                    }
                    className="min-h-12 rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-gray-800 focus:ring-2 focus:ring-gray-200"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                  Estado (UF)
                  <input
                    autoComplete="address-level1"
                    required
                    maxLength={2}
                    value={guestAddress.state}
                    onChange={(event) =>
                      setGuestAddress({
                        ...guestAddress,
                        state: event.target.value
                          .toUpperCase()
                          .replace(/[^A-Z]/g, ""),
                      })
                    }
                    className="min-h-12 rounded-lg border border-gray-300 px-3 font-normal uppercase outline-none focus:border-gray-800 focus:ring-2 focus:ring-gray-200"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700 sm:col-span-2">
                  Complemento ou referência{" "}
                  <span className="font-normal text-gray-500">(opcional)</span>
                  <input
                    autoComplete="address-line2"
                    maxLength={255}
                    value={guestAddress.reference}
                    onChange={(event) =>
                      setGuestAddress({
                        ...guestAddress,
                        reference: event.target.value,
                      })
                    }
                    className="min-h-12 rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-gray-800 focus:ring-2 focus:ring-gray-200"
                  />
                </label>
              </div>
            )}
            <CheckoutStepFooter
              backAction={
                <button
                  type="button"
                  onClick={() => setDeliverySubstep("method")}
                  className="inline-flex min-h-10 self-center items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-950 focus-visible:underline sm:self-start"
                >
                  <FiArrowLeft aria-hidden="true" />
                  Voltar
                </button>
              }
              nextAction={
                <button
                  type="button"
                  onClick={() => handleStepChange(3)}
                  disabled={!canProceedWithSelectedShipping}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gray-950 px-5 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 sm:w-auto"
                >
                  Continuar para pagamento <FiChevronRight className="ml-2" />
                </button>
              }
            />
            {!canProceedWithSelectedShipping && (
              <p className="mt-3 text-sm text-amber-700" role="status">
                {customer &&
                !customerProfileLoading &&
                !customerProfileError &&
                !address?.street
                  ? "Adicione um endereço de entrega no seu perfil para continuar."
                  : missingCheckoutFields.includes("número") &&
                      guestAddress.number &&
                      !Number.isInteger(Number(guestAddress.number))
                    ? "Informe um número de endereço válido."
                    : "Preencha os campos obrigatórios do endereço para continuar."}
              </p>
            )}
          </CheckoutStepCard>
        )}
      {checkoutStep === 3 && (
        <div className="my-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-4">
            <CheckoutStepHeading
              step="Etapa 3 de 3"
              title="Revise seus dados"
              description="Confira o contato e a entrega antes de finalizar o pedido."
              className="my-4 px-1"
            />
            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-gray-950">Contato</h3>
                <button
                  type="button"
                  onClick={() => handleStepChange(1)}
                  aria-label="Editar contato"
                  className="inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-gray-700 underline decoration-gray-300 underline-offset-4 transition hover:text-gray-950"
                >
                  Editar
                </button>
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-3 border-t border-gray-100 pt-3 text-sm sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-xs text-gray-500">Nome</dt>
                  <dd className="mt-0.5 break-words font-medium text-gray-900">
                    {customer ? fullCustomer.name : guestContact.name}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-gray-500">E-mail</dt>
                  <dd className="mt-0.5 break-all font-medium text-gray-900">
                    {customer ? fullCustomer.email : guestContact.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Celular</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">
                    {customer ? fullCustomer.phone : guestContact.phone}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">CPF</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">
                    {maskCpf(customer ? fullCustomer.cpf : guestContact.cpf)}
                  </dd>
                </div>
              </dl>
            </section>
            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-gray-950">Entrega</h3>
                <button
                  type="button"
                  onClick={() => handleStepChange(2)}
                  aria-label="Editar entrega"
                  className="inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-gray-700 underline decoration-gray-300 underline-offset-4 transition hover:text-gray-950"
                >
                  Editar
                </button>
              </div>
              <div className="mt-3 border-t border-gray-100 pt-3">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className="font-semibold text-gray-900">
                    {selectedShippingOption?.label || shippingLabel || "Envio"}
                  </p>
                  <p className="text-sm font-medium text-gray-700">
                    {shippingPriceLabel}
                  </p>
                </div>
                <p className="mt-1 break-words text-sm leading-5 text-gray-600">
                  {address?.street
                    ? `${address.street}, ${address.number || "s/n"} · ${address.district}, ${address.city}/${address.state}`
                    : `Endereço cadastrado · CEP ${address?.zip || "não informado"}`}
                </p>
                {selectedShippingOption?.method === "pickup" && (
                  <p className="mt-2 break-words text-sm leading-5 text-gray-600">
                    <span className="block font-medium text-gray-800">
                      Local de retirada
                    </span>
                    <span>{pickupAddressLabel}</span>
                  </p>
                )}
                {address?.reference && (
                  <p className="mt-1 break-words text-sm text-gray-500">
                    Referência: {address.reference}
                  </p>
                )}
              </div>
            </section>
          </div>
          <section className="md:mt-[7.7rem] h-fit rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-semibold text-gray-950">
              Resumo do pedido
            </h2>
            <div className="mt-4 text-sm">
              <div className="border-b border-gray-100 pb-3">
                <ul className="mt-2 divide-y divide-gray-100">
                  {Object.entries(cartDetails).map(([cartKey, product]) => {
                    const unitPrice =
                      Number.parseFloat(
                        String(product.price).replace(/[.,]/g, ""),
                      ) || 0;
                    const lineTotal = Math.round(
                      unitPrice * product.quantity * (1 - product.promo / 100),
                    );
                    const variationLabel = product.variationLabel?.trim();
                    const productName =
                      variationLabel &&
                      product.name.endsWith(` - ${variationLabel}`)
                        ? product.name.slice(0, -(variationLabel.length + 3))
                        : product.name;

                    return (
                      <li
                        key={cartKey}
                        className="flex items-start justify-between gap-3 py-2 text-gray-700"
                      >
                        <div className="min-w-0">
                          <p className="break-words font-medium text-gray-900">
                            {productName}
                            {variationLabel ? ` (${variationLabel})` : ""}
                            {` × ${product.quantity}`}
                          </p>
                        </div>
                        <span className="shrink-0 font-medium text-gray-900">
                          {formatSimpleCurrency(lineTotal)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="flex justify-between gap-3 py-3 text-gray-600">
                <span>
                  {selectedShippingOption?.label || shippingLabel || "Envio"}
                </span>
                <span className="font-medium text-gray-900">
                  {shippingPriceLabel}
                </span>
              </div>
              <div className="flex items-end justify-between gap-3 border-t border-gray-200 pt-4">
                <span className="font-semibold text-gray-950">Total</span>
                <div className="text-right">
                  <TotalPrice
                    price={discountPrice + frete}
                    fullPrice={totalPrice + frete}
                  />
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              {paymentConfigured
                ? "Você será direcionado para o ambiente seguro do Mercado Pago."
                : "A loja receberá seu pedido pelo WhatsApp e combinará a confirmação com você."}
            </p>
            <div className="mt-4 border-t border-gray-200 pt-4">
              {paymentConfigured && canProceedWithSelectedShipping ? (
                <p className="text-sm text-gray-600">
                  Revise seus dados e continue para o pagamento seguro.
                </p>
              ) : !paymentConfigured && canProceedWithSelectedShipping ? (
                <p className="text-sm text-gray-600">
                  Confira o pedido antes de enviar a solicitação à loja.
                </p>
              ) : (
                <p className="text-sm text-amber-700">
                  {selectedDeliveryBlocked
                    ? "Aguarde a cotação ou escolha outra opção de entrega."
                    : "Confira os dados de contato e entrega para continuar."}
                </p>
              )}
            </div>
          </section>
          <CheckoutStepFooter
            className="sm:col-span-2"
            backAction={
              <button
                type="button"
                onClick={() => handleStepChange(2)}
                className="inline-flex min-h-10 self-center items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-950 focus-visible:underline sm:self-start"
              >
                <FiArrowLeft aria-hidden="true" />
                Voltar
              </button>
            }
            nextAction={
              paymentConfigured && canProceedWithSelectedShipping ? (
                <button
                  type="button"
                  onClick={handlePaymentClick}
                  disabled={loading || !canProceedWithSelectedShipping}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#009ee3] px-5 py-3 font-semibold text-white transition hover:bg-[#008ac7] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <SiMercadopago className="h-6 w-6" aria-hidden="true" />
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner label="Preparando pagamento" /> Preparando
                      pagamento…
                    </span>
                  ) : (
                    <>Pagar com Mercado Pago</>
                  )}
                </button>
              ) : !paymentConfigured && canProceedWithSelectedShipping ? (
                <a
                  href={
                    storeInfo.whatsapp
                      ? `https://api.whatsapp.com/send?phone=55${storeInfo.whatsapp.replace(/\D/g, "")}&text=${encodeURIComponent(buildWhatsAppMessage())}`
                      : undefined
                  }
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    if (!canProceedWithSelectedShipping || !storeInfo.whatsapp)
                      event.preventDefault();
                  }}
                  aria-disabled={
                    !canProceedWithSelectedShipping || !storeInfo.whatsapp
                  }
                  tabIndex={
                    !canProceedWithSelectedShipping || !storeInfo.whatsapp
                      ? -1
                      : undefined
                  }
                  className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-whatsapp px-5 py-3 font-semibold text-white sm:w-auto ${!canProceedWithSelectedShipping || !storeInfo.whatsapp ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  Finalizar pelo WhatsApp <FiChevronRight className="text-lg" />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex min-h-12 w-full items-center justify-center rounded-xl bg-gray-300 px-5 font-semibold text-gray-600 sm:w-auto"
                >
                  {customerProfileLoading
                    ? "Carregando seus dados…"
                    : customerProfileError
                      ? "Não foi possível carregar seu cadastro"
                      : selectedDeliveryBlocked
                        ? quoteLoading
                          ? "Calculando entrega…"
                          : "Entrega indisponível para este CEP"
                        : "Complete os dados para continuar"}
                </button>
              )
            }
          />
        </div>
      )}
    </section>
  );
};

export default Checkout;
